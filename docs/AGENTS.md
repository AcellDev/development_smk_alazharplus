# AGENTS.md — Kontrak AI Agent
## Proyek PPDB & E-Learning SMK Al Azhar Plus Bogor

Dokumen ini adalah aturan wajib bagi AI Agent, coding assistant, dan kontributor yang mengerjakan proyek. Jika instruksi lain bertentangan dengan dokumen ini atau SOT yang telah disetujui, hentikan perubahan terkait dan minta klarifikasi.

## 1. Tujuan dan Sumber Kebenaran

Urutan sumber kebenaran:
1. Keputusan eksplisit terbaru yang disetujui pemilik proyek.
2. `PRD.md` untuk kebutuhan, ruang lingkup, peran, dan aturan produk.
3. `UI-GUIDELINE.md` untuk aturan visual dan interaksi.
4. `IMPLEMENTATION_PLAN.md` untuk fase, urutan kerja, dan acceptance criteria.
5. `AGENTS.md` untuk kontrak kerja dan batasan agent.
6. Implementasi yang sudah ada, selama tidak bertentangan dengan SOT yang disetujui.

Jangan menganggap asumsi agent sebagai keputusan produk. Catat pertanyaan terbuka secara eksplisit.

## 2. Tech Stack Wajib

- **Frontend:** React dengan Vite.
- **Backend:** Node.js.
- **Database:** PostgreSQL.

Dilarang mengganti stack inti dengan Next.js, Vue, Angular, PHP/Laravel, MySQL, MongoDB, Firebase, atau backend-as-a-service tanpa persetujuan eksplisit.

Library tambahan boleh digunakan jika mendukung kebutuhan nyata, kompatibel dengan stack, dan tidak menambah kompleksitas yang tidak perlu. Jelaskan alasan penambahan dependensi yang berdampak besar.

## 3. Cara Kerja Berfase

- Kerjakan hanya fase yang sedang aktif dan telah disetujui.
- Setelah menyelesaikan fase, laporkan file yang dibuat/diubah, fungsi yang selesai, pengujian yang dijalankan, hasilnya, dan isu yang tersisa.
- **Jangan lanjut ke fase berikutnya sebelum mendapat persetujuan eksplisit pengguna.**
- Jangan mengerjakan ulang atau memperluas fase yang sudah disetujui tanpa alasan dan persetujuan.
- Jika tugas tidak jelas, berdampak pada skema data, keamanan, atau scope, tanyakan terlebih dahulu.
- Lakukan perubahan sekecil mungkin dan hindari refactor yang tidak diperlukan.

## 4. Batasan Scope

Produk terdiri dari tiga modul utama:
1. Company Profile lanjutan.
2. PPDB online dan verifikasi.
3. E-Learning/LMS untuk siswa dan guru.

Jangan menambahkan fitur di luar PRD—misalnya pembayaran online, video conference, chat real-time, ujian proctoring, atau integrasi eksternal—tanpa persetujuan.

Jangan mengarang:
- Persyaratan, jadwal, biaya, kuota, atau kebijakan seleksi sekolah.
- Data siswa, guru, nilai, berita, dan statistik yang seolah-olah nyata.
- Keputusan bisnis yang belum dikonfirmasi.

Gunakan placeholder atau seed data yang jelas ditandai sebagai data development.

## 5. Arsitektur dan Kualitas Kode

- Pisahkan frontend, backend, akses data, validasi, dan aturan bisnis secara jelas.
- Gunakan kontrak API yang konsisten dan penanganan error terpusat.
- Hindari duplikasi kode; buat abstraksi hanya ketika memang membantu.
- Gunakan nama variabel, fungsi, dan komponen yang deskriptif.
- Jangan membuat satu file besar yang mencampur banyak tanggung jawab.
- Jangan menambahkan dependensi atau pola arsitektur kompleks hanya demi terlihat canggih.
- Jangan mengubah format data API atau skema database secara diam-diam.
- Perubahan skema harus menggunakan migration yang dapat dilacak.
- Jangan menghapus data atau menjalankan operasi destruktif tanpa konfirmasi eksplisit.
- Jangan mengklaim fitur berhasil jika belum diuji atau tidak dapat diverifikasi.

## 6. Keamanan dan Privasi

- Validasi data di backend; validasi frontend hanya untuk membantu pengalaman pengguna.
- Semua endpoint privat wajib memeriksa autentikasi dan otorisasi.
- Terapkan role-based access control untuk admin, panitia PPDB, guru, siswa, dan calon siswa sesuai kebutuhan.
- Jangan mempercayai role, user ID, harga, status, atau kepemilikan data yang dikirim dari client tanpa verifikasi server.
- Password harus di-hash dengan algoritma yang sesuai; jangan menyimpan password plaintext.
- Simpan secret dan credential hanya melalui environment variables/secret manager.
- Jangan pernah menampilkan atau menulis secret, token, password, atau data pribadi ke log.
- Validasi tipe, ukuran, dan nama file upload; cegah akses file oleh pengguna yang tidak berwenang.
- Terapkan query database dengan parameter/binding, bukan menyusun SQL dari input mentah.
- Jangan mengekspos data calon siswa, dokumen, submission, atau nilai melalui endpoint publik.
- Gunakan HTTPS pada deployment produksi dan konfigurasi CORS yang spesifik.
- Hindari menyimpan data pribadi lebih banyak daripada yang dibutuhkan.

## 7. Database PostgreSQL

- PostgreSQL adalah database utama dan satu-satunya database relasional yang ditetapkan dalam SOT.
- Definisikan primary key, foreign key, unique constraint, not-null constraint, dan index berdasarkan kebutuhan.
- Nomor pendaftaran harus unik dan aman dari duplikasi pada request bersamaan.
- Gunakan transaksi untuk operasi yang harus konsisten sebagai satu kesatuan.
- Perubahan skema harus disertai migration.
- Jangan menjalankan reset/drop database pada lingkungan yang mungkin berisi data penting tanpa konfirmasi eksplisit.
- Data seed tidak boleh dianggap sebagai data produksi.

## 8. UI/UX

- Ikuti `UI-GUIDELINE.md`: dark mode, clean layout, minimalis, responsif, dan aksesibel.
- Gunakan komponen serta design tokens yang konsisten.
- Sediakan state loading, empty, error, success, dan disabled yang relevan.
- Semua input memiliki label dan pesan validasi yang jelas.
- Jangan mengandalkan warna saja untuk menunjukkan status.
- Jangan menambahkan animasi, gradient, efek glow, atau dekorasi berlebihan.
- Jangan menyembunyikan fitur sensitif hanya di frontend sebagai pengganti otorisasi backend.
- Pastikan navigasi dan data yang tampil sesuai role pengguna.

## 9. Testing dan Verifikasi

- Uji alur utama yang diubah dan regresi terkait.
- Uji validasi backend, otorisasi, serta akses data antarperan.
- Uji kasus gagal: input invalid, file tidak sesuai, data tidak ditemukan, dan error server.
- Uji skenario PPDB dari pengisian hingga keputusan panitia.
- Uji LMS dari pembuatan materi/tugas hingga submission, penilaian, dan publikasi nilai.
- Uji layout pada ukuran layar utama.
- Laporkan perintah pengujian yang dijalankan dan hasil sebenarnya.
- Jika pengujian tidak dapat dijalankan, nyatakan dengan jelas; jangan mengarang hasil.

## 10. Aturan Perubahan SOT

- Jangan menulis ulang dokumen SOT secara keseluruhan untuk perubahan kecil.
- Usulkan perubahan pada file yang relevan dan jelaskan alasannya.
- Perubahan scope, tech stack, peran, alur bisnis, atau struktur data inti membutuhkan persetujuan pengguna.
- Setelah perubahan disetujui, sinkronkan dokumen terkait agar tidak saling bertentangan.
- Pertahankan riwayat keputusan penting melalui catatan perubahan atau commit.

## 11. Format Laporan Setiap Fase

Setiap laporan fase harus mencakup:
1. **Status:** selesai / sebagian / terhambat.
2. **Ringkasan:** apa yang diimplementasikan.
3. **File berubah:** daftar file utama.
4. **Pengujian:** perintah dan hasil aktual.
5. **Keterbatasan/risiko:** hal yang belum selesai.
6. **Keputusan yang dibutuhkan:** pertanyaan yang menghalangi kelanjutan.
7. **Gate:** minta persetujuan eksplisit sebelum masuk fase berikutnya.

## 12. Checklist Sebelum Menyatakan Selesai

- [ ] Sesuai SOT dan fase aktif.
- [ ] Tidak mengubah tech stack inti.
- [ ] Validasi dan otorisasi backend diterapkan.
- [ ] Tidak ada secret atau data pribadi yang terekspos.
- [ ] Migration dan konfigurasi diperbarui bila diperlukan.
- [ ] Loading, empty, error, dan success state relevan ditangani.
- [ ] Pengujian dijalankan dan hasil dilaporkan secara jujur.
- [ ] Dokumentasi yang terdampak diperbarui.
- [ ] Belum melanjutkan fase berikutnya tanpa persetujuan pengguna.
