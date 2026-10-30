# Implementation Plan
## PPDB & E-Learning SMK Al Azhar Plus Bogor

**Metode:** Rapid Application Development (RAD)  
**Stack tetap:** React + Vite, Node.js, PostgreSQL  
**Prinsip:** fase dikerjakan berurutan, setiap fase ditinjau dan disetujui sebelum melanjutkan ke fase berikutnya.

## Aturan Pelaksanaan

- Selesaikan output dan acceptance criteria fase aktif sebelum memulai fase selanjutnya.
- Jangan mengubah stack, ruang lingkup, atau struktur besar tanpa persetujuan.
- Gunakan data dummy hanya untuk development dan beri penanda yang jelas.
- Setiap fitur baru harus mencakup UI, API, validasi, izin akses, dan pengujian yang relevan.
- Catat keputusan terbuka dan jangan menebak kebijakan sekolah.
- Simpan konfigurasi rahasia di environment variables; sediakan `.env.example` tanpa nilai rahasia.

## Fase 0 — Requirements Planning dan Validasi

**Tujuan:** memastikan kebutuhan inti dan batasan disepakati sebelum implementasi.

**Pekerjaan**
- Validasi peran pengguna dan hak akses.
- Konfirmasi alur PPDB, status, dokumen wajib, jadwal, dan proses seleksi.
- Konfirmasi kebutuhan LMS, kelas, keanggotaan, tugas, penilaian, dan publikasi nilai.
- Konfirmasi struktur konten company profile.
- Tetapkan prioritas MVP dan daftar fitur di luar ruang lingkup.

**Output**
- PRD disetujui.
- Daftar keputusan terbuka.
- User flow inti PPDB dan LMS.
- Prioritas MVP yang disepakati.

**Acceptance criteria**
- Tidak ada konflik besar pada alur pengguna.
- Pihak terkait menyetujui fitur Must dan aturan bisnis inti.

**Gate:** minta persetujuan sebelum Fase 1.

## Fase 1 — Setup Proyek dan Fondasi

**Tujuan:** menyiapkan repositori, aplikasi, database, dan standar pengembangan.

**Pekerjaan**
- Siapkan frontend React dengan Vite.
- Siapkan backend Node.js dengan struktur modul yang jelas.
- Pilih library routing, form, validasi, dan styling sesuai kebutuhan tanpa menambah dependensi berlebihan.
- Siapkan koneksi PostgreSQL dan konfigurasi environment.
- Siapkan migrasi database dan mekanisme seed data development.
- Siapkan linting/formatting, error handling dasar, dan dokumentasi menjalankan aplikasi.
- Siapkan struktur upload file yang aman atau abstraksi storage yang dapat dikonfigurasi.

**Output**
- Struktur repository dan folder.
- Frontend dan backend dapat dijalankan secara lokal.
- Koneksi database berhasil.
- `.env.example`, migrasi awal, dan README setup.

**Acceptance criteria**
- Aplikasi berjalan dari instruksi README.
- Tidak ada secret yang di-commit.
- Error koneksi/konfigurasi ditangani dengan pesan yang wajar.

**Gate:** minta persetujuan sebelum Fase 2.

## Fase 2 — Design System, Layout, dan Autentikasi

**Tujuan:** membangun fondasi antarmuka dan keamanan akses.

**Pekerjaan**
- Implementasikan design tokens dari UI-GUIDELINE.md.
- Buat komponen dasar: Button, Input, Select, Card, Badge, Table, Modal, Alert, Loading, dan Empty State.
- Buat layout website publik.
- Buat layout dashboard dengan sidebar/topbar responsif.
- Implementasikan login/logout dan autentikasi backend.
- Implementasikan role-based authorization di backend.
- Lindungi route frontend sebagai UX, tanpa menjadikannya pengganti keamanan backend.

**Output**
- Design system dasar.
- Layout publik dan dashboard.
- Login/logout berfungsi.
- Middleware/guard otorisasi dan pengujian akses dasar.

**Acceptance criteria**
- Komponen inti konsisten dan responsif.
- Endpoint terproteksi menolak akses tanpa izin.
- Pengguna tidak dapat mengakses data peran lain hanya dengan mengubah URL.

**Gate:** minta persetujuan sebelum Fase 3.

## Fase 3 — Company Profile

**Tujuan:** mengembangkan website publik dan pengelolaan konten.

**Pekerjaan**
- Bangun Beranda, Profil, Program Keahlian, Berita/Agenda, dan Kontak.
- Buat API dan model data konten.
- Buat dashboard admin untuk CRUD konten yang disepakati.
- Implementasikan validasi dan upload media.
- Optimalkan gambar dan metadata dasar halaman.

**Output**
- Company profile publik terhubung dengan PostgreSQL.
- CRUD konten tersedia bagi role yang berwenang.

**Acceptance criteria**
- Konten yang disimpan tampil pada halaman publik.
- Form admin memvalidasi input.
- Pengunjung tidak dapat mengakses endpoint admin.
- Halaman utama responsif.

**Gate:** demo dan minta persetujuan sebelum Fase 4.

## Fase 4 — Modul PPDB Online

**Tujuan:** menyelesaikan pendaftaran calon siswa dan verifikasi panitia.

**Pekerjaan**
- Implementasikan konfigurasi periode, jadwal, persyaratan, dan pengumuman.
- Buat formulir pendaftaran dan validasi server-side.
- Buat generator nomor pendaftaran unik dengan perlindungan terhadap duplikasi.
- Buat upload dan akses dokumen yang aman.
- Buat ringkasan, pengiriman final, dan bukti pendaftaran.
- Buat halaman status calon siswa.
- Buat dashboard panitia: daftar, pencarian, filter, detail, verifikasi, catatan perbaikan, dan hasil seleksi.
- Catat riwayat perubahan status.
- Terapkan otorisasi agar calon siswa hanya mengakses pendaftarannya sendiri.

**Output**
- Alur PPDB dari formulir hingga keputusan panitia.
- Dashboard panitia dan halaman status calon siswa.

**Acceptance criteria**
- Nomor pendaftaran tidak duplikat pada kondisi request bersamaan.
- File tidak dapat diakses tanpa otorisasi yang sesuai.
- Status hanya dapat diubah oleh role berwenang dan perubahan penting tercatat.
- Validasi gagal tidak menghilangkan seluruh input pengguna.
- Alur diuji dengan data dummy dari awal sampai akhir.

**Gate:** demo alur end-to-end dan minta persetujuan sebelum Fase 5.

## Fase 5 — Modul E-Learning / LMS

**Tujuan:** menyediakan fungsi pembelajaran inti bagi guru dan siswa.

**Pekerjaan**
- Buat struktur kelas dan keanggotaan.
- Buat dashboard guru dan siswa.
- Implementasikan CRUD materi untuk guru yang berwenang.
- Implementasikan pembuatan tugas, tenggat, dan lampiran opsional.
- Implementasikan daftar tugas dan pengumpulan oleh siswa.
- Implementasikan penilaian, umpan balik, dan publikasi hasil.
- Terapkan batas akses pada kelas, materi, tugas, submission, dan nilai.
- Uji aturan tenggat dan pengumpulan ulang sesuai keputusan produk.

**Output**
- Alur LMS dari pembuatan materi hingga penilaian.

**Acceptance criteria**
- Guru hanya mengelola kelas yang menjadi kewenangannya.
- Siswa hanya mengakses kelas dan submission miliknya.
- Nilai yang belum dipublikasikan tidak terlihat oleh siswa.
- Validasi tenggat dan tipe/ukuran file berjalan di backend.
- Alur diuji dengan akun dummy guru dan siswa.

**Gate:** demo dan minta persetujuan sebelum Fase 6.

## Fase 6 — Integrasi, Pengujian, dan Hardening

**Tujuan:** memastikan modul berjalan konsisten dan aman.

**Pekerjaan**
- Uji integrasi frontend, API, dan PostgreSQL.
- Uji alur kritis PPDB dan LMS.
- Uji validasi, izin akses, upload, dan penanganan error.
- Uji tampilan mobile/tablet/desktop.
- Periksa log, pesan error, konfigurasi environment, dan kebocoran data.
- Tambahkan data seed nonproduksi untuk demo.
- Perbaiki bug berdasarkan prioritas.

**Output**
- Checklist pengujian dan daftar bug.
- Build siap untuk UAT.
- Catatan risiko yang belum terselesaikan.

**Acceptance criteria**
- Tidak ada bug kritis yang diketahui pada alur Must.
- Semua endpoint sensitif memvalidasi autentikasi dan otorisasi.
- Tidak ada data pribadi yang terekspos melalui endpoint publik atau log yang tidak semestinya.

**Gate:** minta persetujuan UAT sebelum Fase 7.

## Fase 7 — UAT, Finishing, dan Deployment

**Tujuan:** menyerahkan sistem yang dapat dievaluasi dan digunakan sesuai lingkungan yang disetujui.

**Pekerjaan**
- Lakukan User Acceptance Testing bersama perwakilan pengguna.
- Perbaiki temuan UAT sesuai prioritas dan persetujuan.
- Rapikan copywriting, state UI, responsivitas, dan konsistensi visual.
- Siapkan konfigurasi production, build, migrasi, seed yang aman, dan backup.
- Dokumentasikan deployment, akun/role awal, backup/restore, serta prosedur pemeliharaan.
- Pastikan data dummy tidak tercampur dengan data produksi.

**Output**
- Build rilis.
- Dokumentasi pengguna dan teknis.
- Checklist deployment dan UAT.
- Daftar batasan versi awal.

**Acceptance criteria**
- Skenario UAT yang disepakati lulus.
- Sekolah menerima fitur yang masuk ruang lingkup.
- Prosedur deployment dan backup terdokumentasi.
- Tidak ada kredensial default atau secret yang tertinggal.

## Urutan Prioritas MVP

1. Fondasi aplikasi, database, dan autentikasi.
2. Company profile publik.
3. PPDB: formulir, dokumen, nomor pendaftaran, status, dan verifikasi.
4. LMS: kelas, materi, tugas, submission, penilaian.
5. Integrasi, keamanan, pengujian, UAT, dan deployment.

## Risiko dan Mitigasi

- **Kebutuhan sekolah belum lengkap:** catat sebagai keputusan terbuka dan validasi sebelum implementasi terkait.
- **Scope creep:** semua perubahan fitur melewati penilaian dampak dan persetujuan.
- **Data pribadi bocor:** terapkan otorisasi server-side, storage privat, dan pengujian akses.
- **Waktu pengerjaan terbatas:** prioritaskan alur Must; tunda fitur tambahan.
- **Integrasi sulit:** definisikan kontrak API dan skema data sebelum membangun UI yang bergantung padanya.
