# SMK Al Azhar Plus Bogor — PPDB & E-Learning

Fondasi aplikasi pada Fase 1: React + Vite + Tailwind CSS, API Node.js, dan PostgreSQL.

## Prasyarat

- Node.js 20.19+ atau 22.12+.
- PostgreSQL yang berjalan lokal.

## Menjalankan lokal

1. Salin `.env.example` menjadi `.env` dan sesuaikan `DATABASE_URL` dengan database lokal.
2. Dari root, jalankan `npm install`.
3. Jalankan migrasi dengan `npm run migrate`.
4. Jalankan frontend dan backend dengan `npm run dev`.
5. Frontend tersedia di `http://localhost:5173`; pemeriksaan API/database di `http://localhost:3000/api/health`.

Backend juga dapat dijalankan sendiri dengan `npm run dev:backend`, frontend dengan `npm run dev:frontend`.

## Autentikasi

Role dasar dibuat oleh migrasi `002_auth_sessions.sql`. Login menerima akun yang sudah dibuat secara administratif pada tabel `users` dengan `password_hash` bcrypt dan role yang sesuai. Pembuatan akun dan pengelolaan pengguna belum termasuk fase ini; jangan masukkan password plaintext ke database.

Sesi menggunakan cookie `HttpOnly`, `SameSite=Strict`; token acak hanya disimpan dalam bentuk hash di database dan dicabut saat logout. Endpoint contoh `GET /api/auth/admin-check` dibatasi untuk admin website dan admin PPDB.

## Migrasi

File SQL di `backend/src/database/migrations` dijalankan berurutan dan dicatat pada `schema_migrations`. Setiap migrasi berlangsung dalam transaksi. Jangan mengubah migrasi yang sudah diterapkan; tambahkan file bernomor berikutnya.

Skema awal memetakan entitas konseptual PRD. Field wajib, kebijakan PPDB, relasi lebih rinci, serta aturan retensi masih perlu validasi sekolah sebelum skema dianggap final.

## Company profile

Migrasi `003_company_profile.sql` menambah metadata konten dan tabel kontak sekolah. API publik tersedia di `/api/content/home`, `/api/content/profiles`, `/api/content/programs`, `/api/content/news`, `/api/content/events`, dan `/api/content/contact`. CRUD ada pada `/api/content/admin/:resource` dan hanya dapat digunakan oleh role `admin_website`.

Untuk mengisi hero Beranda, buat halaman profil dengan slug `beranda`; halaman profil lainnya tampil pada `/profil`.

Unggah gambar admin ada di `POST /api/content/media` dengan field multipart `file`. Backend menerima JPEG, PNG, dan WebP setelah memeriksa signature berkas, dengan batas default 5 MB (maksimal konfigurasi 10 MB). Aset disimpan di `UPLOAD_DIR` dan hanya dapat dibaca publik jika sudah terhubung ke konten yang diterbitkan. Jangan menyimpan file upload di direktori publik.

## PPDB

Migrasi `004_ppdb_module.sql` menambah jadwal, persyaratan per periode, metadata pendaftar, dan nomor pendaftaran berbasis sequence PostgreSQL. Panitia dengan role `admin_ppdb` mengatur `/dashboard/admissions`; calon siswa mendaftar di `/ppdb/daftar` dan melihat status di `/ppdb/status`. Tidak ada periode, jadwal, atau dokumen wajib contoh yang dibuat otomatis.

Dokumen calon siswa diunggah melalui API terautentikasi, diperiksa signature-nya, dan disimpan di `PRIVATE_UPLOAD_DIR` dengan izin file privat. Dokumen hanya dapat diunduh oleh pemilik pendaftaran atau panitia PPDB. Nomor pendaftaran dijamin unik oleh sequence dan constraint database.

## E-Learning / LMS

Migrasi `005_lms_module.sql` menambah metadata kelas, hubungan mata pelajaran, lampiran privat, tenggat, dan pengaturan pengumpulan ulang. Admin website menyiapkan kelas, mata pelajaran, serta keanggotaan guru/siswa di `/dashboard/classes`. Akun guru dan siswa harus lebih dahulu dibuat dengan role yang benar.

Guru hanya dapat mengelola materi, tugas, pengumpulan, dan nilai untuk kelas yang memiliki keanggotaan guru. Siswa hanya dapat membuka kelas tempat ia terdaftar. File LMS menggunakan `PRIVATE_UPLOAD_DIR`, diperiksa signature-nya, dan hanya dapat diunduh oleh anggota kelas yang berwenang. Pengumpulan ulang tidak aktif secara default dan dapat diizinkan guru per tugas; tenggat ditegakkan backend. Nilai dan umpan balik hanya dikirim ke siswa setelah guru menerbitkannya.

## Upload

`UPLOAD_DIR` menunjuk ke direktori privat di luar web root. File tidak disajikan secara statis; untuk gambar company profile, gunakan endpoint unggah yang didokumentasikan di atas.

## Status konfigurasi

Tidak ada akun default untuk production. Simpan konfigurasi lokal hanya di `.env`; jangan commit file tersebut.

## Seed development (Fase 6)

Jalankan migrasi lalu seed dari root project:

```sh
npm run migrate
npm run seed
```

Seed memerlukan `SEED_DEMO_PASSWORD` minimal 12 karakter di `.env`. Nilai contoh pada `.env.example` hanya untuk development lokal dan berlaku sama bagi akun berikut:

| Role | Email |
|---|---|
| Admin website | `admin.website@demo.alazhar.test` |
| Admin PPDB | `admin.ppdb@demo.alazhar.test` |
| Guru | `guru@demo.alazhar.test` |
| Siswa | `siswa@demo.alazhar.test` |

Password development contoh: `DemoOnly-ChangeMe-2026!`. Ganti nilai tersebut di `.env` bila dibutuhkan. Password hanya disimpan dalam bentuk bcrypt hash. Script menolak berjalan dengan `NODE_ENV=production`, aman dijalankan berulang, dan tidak menghapus data.

Seed dibatasi untuk lingkungan development dan membuat akun pengujian serta materi pembelajaran awal. Data identitas sekolah pada halaman publik mengacu pada informasi satuan pendidikan yang tersedia. Periode PPDB disimpan tertutup dan tidak dipublikasikan; jadwal, persyaratan, dan pengumuman tetap menunggu konfirmasi resmi sekolah. Agenda belum dipublikasikan sampai sekolah menetapkan kegiatan dan tanggalnya. Lengkapi informasi tersebut melalui dashboard sebelum periode pendaftaran atau kegiatan diumumkan kepada publik. Jangan gunakan akun atau password seed di production.
