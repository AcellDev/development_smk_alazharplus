# Product Requirements Document (PRD)
## Sistem Informasi PPDB dan E-Learning SMK Al Azhar Plus Bogor

**Status:** Draf awal  
**Versi:** 1.0  
**Metode pengembangan:** Rapid Application Development (RAD)  
**Target platform:** Website responsif

---

## 1. Latar Belakang

SMK Al Azhar Plus Bogor telah memiliki website company profile yang berfungsi sebagai media informasi sekolah. Pengembangan lanjutan diperlukan agar website tidak hanya menyampaikan informasi, tetapi juga mendukung proses administrasi penerimaan peserta didik baru (PPDB) dan kegiatan pembelajaran digital.

Proyek ini mengembangkan ulang website lama menjadi sistem informasi terintegrasi yang mencakup company profile, PPDB online, dan Learning Management System (LMS). Pengembangan menggunakan pendekatan RAD agar prototipe dapat dievaluasi secara berkala oleh pemangku kepentingan dan disempurnakan berdasarkan umpan balik.

## 2. Tujuan Produk

1. Memperbarui website company profile agar informatif, konsisten, responsif, dan mudah dikelola.
2. Memungkinkan calon siswa mengisi pendaftaran PPDB secara online dan memantau statusnya.
3. Membantu admin/panitia memeriksa data dan dokumen pendaftar serta memperbarui status seleksi.
4. Menyediakan LMS untuk mendukung distribusi materi, tugas, pengumpulan tugas, dan pengelolaan pembelajaran oleh guru.
5. Menyediakan akses sesuai peran pengguna dengan pengelolaan data yang aman dan terstruktur.

## 3. Pengguna dan Peran

- **Pengunjung:** melihat informasi publik sekolah, program keahlian, berita, agenda, dan informasi PPDB.
- **Calon siswa:** membuat akun atau mengakses formulir, mengisi data, mengunggah dokumen, serta memantau status pendaftaran.
- **Admin PPDB:** mengelola periode PPDB, memeriksa pendaftaran dan dokumen, memperbarui status, serta mengelola pengumuman.
- **Admin website:** mengelola konten company profile dan akun/role pengguna sesuai kewenangan.
- **Guru:** mengelola kelas yang ditugaskan, materi, tugas, dan penilaian.
- **Siswa:** mengakses kelas yang diikuti, membaca materi, mengumpulkan tugas, dan melihat umpan balik/nilai.

Catatan: pemisahan Admin Website dan Admin PPDB dapat disatukan pada implementasi awal jika sumber daya terbatas, tetapi izin akses tetap harus dibedakan secara logis.

## 4. Ruang Lingkup

### 4.1 Company Profile Lanjutan
- Beranda dengan ringkasan profil, program unggulan, berita terbaru, agenda, dan ajakan melihat PPDB.
- Halaman profil sekolah: sejarah, visi-misi, fasilitas, dan informasi relevan.
- Halaman program keahlian.
- Halaman berita/artikel dan detail berita.
- Halaman agenda/kegiatan.
- Halaman kontak dan informasi lokasi.
- Panel admin untuk CRUD konten yang disepakati.
- Pengelolaan aset gambar dengan validasi format dan ukuran.

### 4.2 Modul PPDB Online
- Informasi persyaratan, alur, jadwal, dan periode PPDB.
- Formulir pendaftaran dengan data calon siswa, orang tua/wali, alamat, dan pendidikan sebelumnya sesuai kebutuhan sekolah.
- Nomor pendaftaran otomatis yang unik.
- Unggah dokumen persyaratan dengan validasi tipe dan ukuran file.
- Ringkasan pendaftaran sebelum pengiriman.
- Halaman status pendaftaran untuk calon siswa.
- Dashboard panitia untuk melihat, mencari, memfilter, dan membuka detail pendaftar.
- Verifikasi data dan dokumen dengan catatan perbaikan bila diperlukan.
- Perubahan status yang tercatat: **Draft**, **Dikirim**, **Perlu Perbaikan**, **Terverifikasi**, **Lulus**, atau **Tidak Lulus**.
- Pengelolaan jadwal, persyaratan, kuota, dan pengumuman PPDB oleh admin.
- Cetak atau unduh bukti pendaftaran sederhana.
- Riwayat perubahan status penting untuk kebutuhan audit.

### 4.3 Modul E-Learning / LMS
- Login dan dashboard berdasarkan peran.
- Guru dapat mengakses kelas yang ditugaskan.
- Guru dapat membuat dan mengelola materi pembelajaran.
- Guru dapat membuat tugas dengan deskripsi, tenggat, dan lampiran opsional.
- Siswa dapat melihat materi dan mengunduh lampiran.
- Siswa dapat mengumpulkan tugas sebelum tenggat, dengan dukungan pengumpulan ulang sesuai aturan tugas.
- Guru dapat melihat daftar pengumpulan, memberi nilai, dan menambahkan umpan balik.
- Siswa dapat melihat status pengumpulan, nilai, dan umpan balik yang telah dipublikasikan.
- Daftar kelas dan keanggotaan siswa dikelola oleh admin atau mekanisme yang disetujui sekolah.

### 4.4 Autentikasi dan Hak Akses
- Login/logout untuk area terproteksi.
- Otorisasi berbasis peran (RBAC) di backend.
- Siswa, guru, dan admin hanya dapat mengakses data yang menjadi kewenangannya.
- Validasi input di frontend dan backend.
- Password disimpan dalam bentuk hash, bukan teks biasa.

## 5. Di Luar Ruang Lingkup Versi Awal

- Aplikasi mobile native.
- Video conference atau kelas langsung terintegrasi.
- Payment gateway dan pembayaran biaya pendaftaran.
- Integrasi otomatis dengan Dapodik atau sistem eksternal.
- Ujian online dengan pengawasan/proctoring.
- Fitur chat real-time.
- Otomatisasi pengambilan keputusan seleksi tanpa persetujuan panitia.

Fitur di luar ruang lingkup dapat dipertimbangkan sebagai pengembangan lanjutan setelah kebutuhan dan kapasitas proyek dikonfirmasi.

## 6. Kebutuhan Fungsional Utama

| ID | Kebutuhan | Prioritas |
|---|---|---|
| FR-01 | Pengunjung dapat membuka halaman company profile publik | Must |
| FR-02 | Admin dapat membuat, membaca, memperbarui, dan menghapus konten yang diizinkan | Must |
| FR-03 | Calon siswa dapat mengisi dan mengirim formulir PPDB | Must |
| FR-04 | Sistem menghasilkan nomor pendaftaran unik | Must |
| FR-05 | Calon siswa dapat mengunggah dokumen sesuai ketentuan | Must |
| FR-06 | Calon siswa dapat melihat status dan catatan perbaikan | Must |
| FR-07 | Panitia dapat mencari, memfilter, memeriksa, dan memperbarui status pendaftar | Must |
| FR-08 | Sistem menerapkan autentikasi dan otorisasi berbasis peran | Must |
| FR-09 | Guru dapat mengelola materi dan tugas pada kelasnya | Must |
| FR-10 | Siswa dapat melihat materi dan mengumpulkan tugas | Must |
| FR-11 | Guru dapat menilai pengumpulan dan memberi umpan balik | Must |
| FR-12 | Siswa dapat melihat nilai dan umpan balik yang dipublikasikan | Must |
| FR-13 | Sistem menyediakan tampilan responsif untuk desktop dan perangkat mobile | Must |
| FR-14 | Sistem menyediakan pesan validasi dan kondisi kosong/error yang jelas | Should |
| FR-15 | Sistem mencatat perubahan status penting pada PPDB | Should |

## 7. Kebutuhan Nonfungsional

- **Keamanan:** validasi server-side, hash password, otorisasi setiap endpoint, pembatasan tipe/ukuran upload, dan perlindungan data pribadi.
- **Privasi:** data calon siswa dan siswa tidak boleh ditampilkan pada halaman publik tanpa dasar dan persetujuan yang sesuai.
- **Kinerja:** halaman utama dan dashboard harus tetap responsif pada koneksi umum; hindari request dan render yang tidak perlu.
- **Usability:** navigasi jelas, label formulir mudah dipahami, pesan kesalahan dapat ditindaklanjuti.
- **Aksesibilitas:** kontras teks memadai, fokus keyboard terlihat, label input tersedia, dan status tidak disampaikan melalui warna saja.
- **Maintainability:** struktur modul terpisah, konfigurasi melalui environment variables, dan dokumentasi setup.
- **Reliabilitas:** validasi data, penanganan error, constraint database, dan backup database sesuai lingkungan deployment.
- **Kompatibilitas:** versi browser modern dan layout mobile/tablet/desktop.

## 8. Data Inti (Konseptual)

Entitas awal yang perlu divalidasi:
- `users`, `roles` atau role pada pengguna.
- `school_profiles`, `programs`, `news`, `events`, `media_assets`.
- `ppdb_periods`, `applicants`, `guardians`, `previous_education`, `application_documents`, `application_status_histories`, `announcements`.
- `classes`, `class_memberships`, `subjects` bila diperlukan, `learning_materials`, `assignments`, `submissions`, `grades` atau nilai/umpan balik pada submission.

Relasi, field wajib, dan aturan retensi data harus ditetapkan sebelum migrasi database final. Hindari menyimpan salinan data yang tidak diperlukan.

## 9. Alur Utama

### PPDB
1. Pengunjung membaca informasi PPDB.
2. Calon siswa mengisi formulir dan mengunggah dokumen.
3. Sistem memvalidasi input dan menghasilkan nomor pendaftaran setelah data berhasil disimpan.
4. Calon siswa mengirim pendaftaran dan menerima ringkasan/bukti.
5. Panitia memeriksa data dan dokumen.
6. Panitia menyetujui, meminta perbaikan, atau menetapkan hasil seleksi.
7. Calon siswa memantau status melalui halaman terproteksi atau mekanisme akses aman yang disepakati.

### LMS
1. Pengguna login.
2. Sistem menampilkan dashboard sesuai peran.
3. Guru mengelola materi/tugas untuk kelas yang diampu.
4. Siswa mengakses materi dan mengirim tugas.
5. Guru menilai tugas dan memberikan umpan balik.
6. Siswa melihat hasil yang telah dipublikasikan.

## 10. Kriteria Penerimaan

- Halaman publik utama dapat diakses tanpa login dan tampil responsif.
- Data konten yang dikelola admin tersimpan di PostgreSQL dan tampil konsisten.
- Formulir PPDB memvalidasi field wajib dan menghasilkan nomor unik.
- File upload divalidasi di server; file tidak dapat diakses oleh pengguna yang tidak berwenang.
- Panitia dapat mengubah status pendaftaran dan perubahan penting tercatat.
- Calon siswa hanya dapat melihat data pendaftarannya sendiri.
- Guru hanya dapat mengelola kelas/tugas yang menjadi kewenangannya.
- Siswa hanya dapat melihat kelas, materi, tugas, dan nilai miliknya.
- Endpoint backend menerapkan autentikasi dan otorisasi, bukan hanya menyembunyikan tombol di UI.
- Tidak ada kredensial rahasia yang ditulis langsung di source code.

## 11. Asumsi dan Hal yang Perlu Dikonfirmasi

- Periode, persyaratan, dokumen wajib, kuota, dan tahapan seleksi PPDB dikonfirmasi oleh sekolah.
- Struktur kelas, akun siswa/guru, dan proses penetapan keanggotaan LMS dikonfirmasi oleh pihak sekolah.
- Kebijakan penyimpanan dan penghapusan data pribadi serta dokumen disetujui pemangku kepentingan.
- Hosting, domain, penyimpanan berkas, mekanisme backup, dan pengiriman notifikasi ditentukan sebelum deployment.
- Peran, alur, dan keputusan yang belum disepakati tidak boleh diasumsikan sebagai kebutuhan final; tandai sebagai keputusan terbuka.

## 12. Metode RAD

Pengembangan dilaksanakan secara iteratif:
1. **Requirements Planning:** konfirmasi kebutuhan, peran, batasan, dan prioritas.
2. **User Design:** buat wireframe/prototipe dan validasi bersama pengguna.
3. **Construction:** implementasi per modul, demo berkala, dan revisi terkontrol.
4. **Cutover:** pengujian penerimaan, migrasi/seed data yang diperlukan, dokumentasi, dan deployment.

Setiap iterasi harus memiliki hasil yang dapat diperiksa dan persetujuan sebelum pekerjaan besar berikutnya.
