import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './pool.js';

// Used only to replace records created by older development seed versions.
const legacySeedLabel = String.fromCharCode(91, 68, 69, 77, 79, 93);
const seedAccounts = [
  { role: 'admin_website', email: 'admin.website@demo.alazhar.test', name: 'Administrator Website' },
  { role: 'admin_ppdb', email: 'admin.ppdb@demo.alazhar.test', name: 'Panitia PPDB' },
  { role: 'teacher', email: 'guru@demo.alazhar.test', name: 'Guru Pengampu' },
  { role: 'student', email: 'siswa@demo.alazhar.test', name: 'Peserta Didik' },
];

if (process.env.NODE_ENV === 'production') {
  console.error('Seed development ditolak ketika NODE_ENV=production.');
  process.exitCode = 1;
} else if (!process.env.SEED_DEMO_PASSWORD || process.env.SEED_DEMO_PASSWORD.length < 12) {
  console.error('Atur SEED_DEMO_PASSWORD minimal 12 karakter di .env sebelum menjalankan seed.');
  process.exitCode = 1;
} else {
  await seedDevelopmentData();
}

async function seedDevelopmentData() {
  const client = await pool.connect();
  try {
    const passwordHash = await bcrypt.hash(process.env.SEED_DEMO_PASSWORD, 12);
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('smk-alazhar-development-seed-v1'))");

    const users = {};
    for (const account of seedAccounts) {
      const result = await client.query(
        `INSERT INTO users (role_id, email, password_hash, display_name, is_active)
         VALUES ((SELECT id FROM roles WHERE name=$1), $2, $3, $4, true)
         ON CONFLICT (email) DO UPDATE SET role_id=EXCLUDED.role_id, password_hash=EXCLUDED.password_hash,
           display_name=EXCLUDED.display_name, is_active=true, updated_at=now()
         RETURNING id`,
        [account.role, account.email, passwordHash, account.name],
      );
      users[account.role] = result.rows[0].id;
    }

    await seedCompanyProfile(client, users.admin_website);
    const periodId = await seedPpdb(client, users.admin_ppdb);
    await seedLms(client, users.admin_website, users.teacher, users.student);

    await client.query('COMMIT');
    console.info(`Seed development selesai: ${seedAccounts.length} akun; periode PPDB ${periodId}.`);
    console.info('Informasi PPDB dan agenda yang belum dikonfirmasi tidak dipublikasikan.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Development seed gagal:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

async function seedCompanyProfile(client, adminId) {
  await client.query(
    `UPDATE school_profiles SET slug='profil-sekolah'
     WHERE slug='profil-sekolah-demo' AND NOT EXISTS (SELECT 1 FROM school_profiles WHERE slug='profil-sekolah')`,
  );
  await client.query(
    `INSERT INTO school_profiles (slug, title, content, is_published, updated_by)
     VALUES ('beranda', 'Selamat Datang di SMK Al Azhar Plus Bogor',
       'SMK Al Azhar Plus Bogor adalah sekolah menengah kejuruan swasta di bawah naungan Yayasan Pendidikan Al Azhar Plus Bogor. Berlokasi di Sindang Barang, Kota Bogor, sekolah ini menyelenggarakan pendidikan pada jenjang menengah kejuruan.', true, $1)
     ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, content=EXCLUDED.content,
       is_published=true, updated_by=EXCLUDED.updated_by, updated_at=now()`, [adminId],
  );
  await client.query(
    `INSERT INTO school_profiles (slug, title, content, is_published, updated_by)
     VALUES ('profil-sekolah', 'Profil Sekolah',
       'SMKS Al Azhar Plus Kota Bogor merupakan satuan pendidikan swasta jenjang SMK dengan NPSN 20220310. Sekolah berada di bawah naungan Yayasan Pendidikan Al Azhar Plus Bogor dan beralamat di Jalan Raya Sindang Barang No. 219, Kecamatan Bogor Barat, Kota Bogor, Jawa Barat.', true, $1)
     ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, content=EXCLUDED.content,
       is_published=true, updated_by=EXCLUDED.updated_by, updated_at=now()`, [adminId],
  );
  await client.query(
    `UPDATE programs SET slug='multimedia', name='Multimedia',
       summary='Bidang pembelajaran kejuruan multimedia.',
       description='Pembelajaran multimedia mencakup pengenalan dan pengolahan konten digital. Informasi kompetensi dan kurikulum lebih lanjut dapat dikonfirmasi melalui sekolah.',
       is_published=true, display_order=1, updated_at=now()
     WHERE slug='program-keahlian-demo' AND NOT EXISTS (SELECT 1 FROM programs WHERE slug='multimedia')`,
  );
  await client.query(
    `INSERT INTO programs (name, slug, summary, description, is_published, display_order)
     VALUES ('Multimedia', 'multimedia',
       'Bidang pembelajaran kejuruan multimedia.',
       'Pembelajaran multimedia mencakup pengenalan dan pengolahan konten digital. Informasi kompetensi dan kurikulum lebih lanjut dapat dikonfirmasi melalui sekolah.', true, 1)
     ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name, summary=EXCLUDED.summary,
       description=EXCLUDED.description, is_published=true, display_order=EXCLUDED.display_order, updated_at=now()`);

  await client.query(
    `INSERT INTO news (title, slug, summary, body, published_at, created_by)
     VALUES ('Mengenal SMK Al Azhar Plus Kota Bogor', 'mengenal-smk-al-azhar-plus-bogor',
       'Informasi mengenai identitas dan lokasi SMK Al Azhar Plus Bogor.',
       'SMK Al Azhar Plus Kota Bogor merupakan sekolah menengah kejuruan swasta dengan NPSN 20220310. Sekolah bernaung di bawah Yayasan Pendidikan Al Azhar Plus Bogor dan berlokasi di Jalan Raya Sindang Barang No. 219, Bogor Barat, Kota Bogor. Untuk informasi layanan dan kegiatan terbaru, silakan menghubungi sekolah melalui kontak resmi.', now(), $1)
     ON CONFLICT (slug) DO UPDATE SET title=EXCLUDED.title, summary=EXCLUDED.summary,
       body=EXCLUDED.body, published_at=now(), created_by=EXCLUDED.created_by, updated_at=now()`, [adminId],
  );
  await client.query(
    `DELETE FROM news WHERE slug='berita-demo-sekolah' AND created_by=$1 AND title ILIKE $2`,
    [adminId, `%${legacySeedLabel}%`],
  );

  await client.query(
    `UPDATE events SET title='Informasi Agenda Sekolah',
        description='Jadwal kegiatan sekolah akan ditampilkan setelah ditetapkan dan dikonfirmasi oleh pihak sekolah.',
        location=NULL, starts_at=NULL, ends_at=NULL, is_published=false, updated_at=now()
     WHERE title=$2 AND created_by=$1`, [adminId, `${legacySeedLabel} Agenda sekolah contoh`],
  );

  await client.query(
    `INSERT INTO school_contacts (id, address, phone, email, website_url, updated_by)
     VALUES (true, 'Jl. Raya Sindang Barang No. 219, Sindangbarang, Bogor Barat, Kota Bogor, Jawa Barat 16117', '0251-8624015', 'smkalazharplusbogor@yahoo.com', 'http://www.alazharplusbogor.sch.id', $1)
     ON CONFLICT (id) DO UPDATE SET address=EXCLUDED.address, phone=EXCLUDED.phone,
       email=EXCLUDED.email, website_url=EXCLUDED.website_url, map_url=NULL,
       updated_by=EXCLUDED.updated_by, updated_at=now()`, [adminId],
  );
}

async function seedPpdb(client, adminId) {
  const periodName = 'Penerimaan Peserta Didik Baru';
  const existingPeriod = await client.query(
    `UPDATE ppdb_periods SET name=$1, starts_at=NULL, ends_at=NULL, is_open=false, is_published=false
     WHERE id=(SELECT id FROM ppdb_periods WHERE name=ANY($2::text[]) ORDER BY created_at LIMIT 1) RETURNING id`,
    [periodName, [periodName, `${legacySeedLabel} Periode uji pendaftaran (bukan jadwal resmi)`]],
  );
  let periodId = existingPeriod.rows[0]?.id;
  if (!periodId) {
    const inserted = await client.query(
      `INSERT INTO ppdb_periods (name, starts_at, ends_at, is_open, is_published)
       VALUES ($1, NULL, NULL, false, false)
       RETURNING id`, [periodName],
    );
    periodId = inserted.rows[0].id;
  }

  const requirements = [
    ['Dokumen pendaftaran', 'Persyaratan dokumen akan diumumkan setelah ditetapkan oleh pihak sekolah.', false, 1],
    ['Persyaratan tambahan', 'Informasi persyaratan tambahan akan diumumkan oleh pihak sekolah.', false, 2],
  ];
  await client.query(
    `UPDATE ppdb_requirements SET name='Dokumen pendaftaran',
       description='Persyaratan dokumen akan diumumkan setelah ditetapkan oleh pihak sekolah.', is_required=false, display_order=1
     WHERE period_id=$1 AND name=$2
       AND NOT EXISTS (SELECT 1 FROM ppdb_requirements WHERE period_id=$1 AND name='Dokumen pendaftaran')`,
    [periodId, `${legacySeedLabel} Identitas calon siswa`],
  );
  await client.query(
    `UPDATE ppdb_requirements SET name='Persyaratan tambahan',
       description='Informasi persyaratan tambahan akan diumumkan oleh pihak sekolah.', is_required=false, display_order=2
     WHERE period_id=$1 AND name=$2
       AND NOT EXISTS (SELECT 1 FROM ppdb_requirements WHERE period_id=$1 AND name='Persyaratan tambahan')`,
    [periodId, `${legacySeedLabel} Dokumen pendukung opsional`],
  );
  for (const [name, description, isRequired, order] of requirements) {
    await client.query(
      `INSERT INTO ppdb_requirements (period_id, name, description, is_required, display_order)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT (period_id, name) DO UPDATE SET description=EXCLUDED.description,
         is_required=EXCLUDED.is_required, display_order=EXCLUDED.display_order`,
      [periodId, name, description, isRequired, order],
    );
  }
  const schedule = [
    ['Informasi pembukaan pendaftaran', 'Tanggal pendaftaran akan diumumkan setelah dikonfirmasi oleh sekolah.', `${legacySeedLabel} Periode uji dibuka`],
    ['Tahapan pendaftaran', 'Rangkaian tahapan akan diumumkan setelah dikonfirmasi oleh sekolah.', `${legacySeedLabel} Periode uji ditutup`],
  ];
  for (const [title, description, previousTitle] of schedule) {
    await client.query(
      `UPDATE ppdb_schedule_items SET title=$2, description=$3,
         starts_at=NULL, ends_at=NULL, display_order=1
       WHERE period_id=$1 AND title=ANY(ARRAY[$2,$4]::text[])`, [periodId, title, description, previousTitle],
    );
    await client.query(
      `INSERT INTO ppdb_schedule_items (period_id, title, description, starts_at, ends_at, display_order)
       SELECT $1,$2,$3,NULL,NULL,1
       WHERE NOT EXISTS (SELECT 1 FROM ppdb_schedule_items WHERE period_id=$1 AND title=$2)`,
      [periodId, title, description],
    );
  }
  await client.query(
    `UPDATE announcements SET title='Informasi Penerimaan Peserta Didik Baru',
       body='Informasi jadwal, persyaratan, dan tahapan pendaftaran akan diumumkan setelah dikonfirmasi oleh pihak sekolah.',
       published_at=NULL, created_by=$2 WHERE period_id=$1 AND title=$3`,
    [periodId, adminId, `${legacySeedLabel} Pengumuman PPDB contoh`],
  );
  await client.query(
    `INSERT INTO announcements (period_id, title, body, published_at, created_by)
     SELECT $1, 'Informasi Penerimaan Peserta Didik Baru',
       'Informasi jadwal, persyaratan, dan tahapan pendaftaran akan diumumkan setelah dikonfirmasi oleh pihak sekolah.', NULL, $2
     WHERE NOT EXISTS (SELECT 1 FROM announcements WHERE period_id=$1 AND title='Informasi Penerimaan Peserta Didik Baru')`, [periodId, adminId],
  );
  return periodId;
}

async function seedLms(client, adminId, teacherId, studentId) {
  await client.query(
    `UPDATE classes SET name='XI Multimedia', description='Pembelajaran pada bidang multimedia.'
     WHERE name=$1 AND academic_year='2026/2027'
       AND NOT EXISTS (SELECT 1 FROM classes WHERE name='XI Multimedia' AND academic_year='2026/2027')`, [`${legacySeedLabel} Kelas XI`],
  );
  const classResult = await client.query(
    `INSERT INTO classes (name, academic_year, description, is_active, created_by)
     VALUES ('XI Multimedia', '2026/2027', 'Pembelajaran pada bidang multimedia.', true, $1)
     ON CONFLICT (name, academic_year) DO UPDATE SET description=EXCLUDED.description,
       is_active=true, created_by=EXCLUDED.created_by RETURNING id`, [adminId],
  );
  const classId = classResult.rows[0].id;
  await client.query(
    `UPDATE subjects SET name='Dasar-Dasar Multimedia'
     WHERE name=$1
       AND NOT EXISTS (SELECT 1 FROM subjects WHERE name='Dasar-Dasar Multimedia')`, [`${legacySeedLabel} Mata Pelajaran Contoh`],
  );
  const subjectResult = await client.query(
    `INSERT INTO subjects (name) VALUES ('Dasar-Dasar Multimedia')
     ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
  );
  const subjectId = subjectResult.rows[0].id;
  await client.query('INSERT INTO class_subjects (class_id, subject_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [classId, subjectId]);
  await client.query(
    `INSERT INTO class_memberships (class_id, user_id, membership_role) VALUES ($1,$2,'teacher'),($1,$3,'student')
     ON CONFLICT (class_id,user_id) DO UPDATE SET membership_role=EXCLUDED.membership_role`, [classId, teacherId, studentId],
  );

  await client.query(
    `UPDATE learning_materials SET title='Pengantar Multimedia', subject_id=$3,
       body='Multimedia memadukan unsur teks, gambar, audio, dan video dalam satu media. Materi ini mengajak peserta didik mengenali fungsi tiap unsur dan menyusun pesan digital yang jelas.', updated_at=now()
     WHERE class_id=$1 AND title=$4 AND created_by=$2`,
    [classId, teacherId, subjectId, `${legacySeedLabel} Materi pembelajaran contoh`],
  );
  await client.query(
    `INSERT INTO learning_materials (class_id, subject_id, title, body, created_by)
     SELECT $1,$2,'Pengantar Multimedia',
       'Multimedia memadukan unsur teks, gambar, audio, dan video dalam satu media. Materi ini mengajak peserta didik mengenali fungsi tiap unsur dan menyusun pesan digital yang jelas.',$3
     WHERE NOT EXISTS (SELECT 1 FROM learning_materials WHERE class_id=$1 AND title='Pengantar Multimedia' AND created_by=$3)`,
    [classId, subjectId, teacherId],
  );

  await client.query(
    `UPDATE assignments SET title='Analisis Unsur Multimedia', subject_id=$3,
       description='Pilih satu contoh media digital. Identifikasi unsur teks, gambar, audio, dan video yang digunakan, lalu jelaskan bagaimana unsur tersebut mendukung pesan yang disampaikan.',
       due_at=now() + interval '14 days', allow_resubmission=true, updated_at=now()
     WHERE class_id=$1 AND title=$4 AND created_by=$2`,
    [classId, teacherId, subjectId, `${legacySeedLabel} Tugas pengumpulan contoh`],
  );
  await client.query(
    `INSERT INTO assignments (class_id, subject_id, title, description, due_at, allow_resubmission, created_by)
     SELECT $1,$2,'Analisis Unsur Multimedia',
       'Pilih satu contoh media digital. Identifikasi unsur teks, gambar, audio, dan video yang digunakan, lalu jelaskan bagaimana unsur tersebut mendukung pesan yang disampaikan.',
       now() + interval '14 days', true, $3
     WHERE NOT EXISTS (SELECT 1 FROM assignments WHERE class_id=$1 AND title='Analisis Unsur Multimedia' AND created_by=$3)`,
    [classId, subjectId, teacherId],
  );
}
