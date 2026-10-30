# UI Guideline
## PPDB & E-Learning SMK Al Azhar Plus Bogor

**Arah visual:** modern, bersih, minimalis, profesional, dan nyaman untuk penggunaan harian.  
**Tema:** dark mode sebagai tema utama, dengan layout bersih dan kontras yang memadai.

## 1. Prinsip Desain

1. **Clarity first:** pengguna harus memahami posisi, tindakan utama, dan status halaman tanpa menebak.
2. **Content over decoration:** hindari efek dekoratif yang tidak membantu fungsi.
3. **Consistent patterns:** tombol, formulir, tabel, dialog, dan status menggunakan pola yang konsisten.
4. **Role-aware interface:** navigasi dan dashboard menyesuaikan peran pengguna.
5. **Responsive by default:** prioritaskan penggunaan nyaman pada desktop, tablet, dan mobile.
6. **Accessible contrast:** status tidak boleh dibedakan berdasarkan warna saja; gunakan teks/ikon pendamping.

## 2. Design Tokens

Gunakan CSS variables atau token terpusat. Nilai berikut adalah titik awal dan boleh disesuaikan setelah prototipe diuji.

```css
:root {
  color-scheme: dark;
  --color-bg: #0B1120;
  --color-surface: #111827;
  --color-surface-raised: #1F2937;
  --color-border: #334155;
  --color-text: #F8FAFC;
  --color-text-muted: #94A3B8;
  --color-primary: #16A34A;
  --color-primary-hover: #15803D;
  --color-link: #60A5FA;
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-danger: #EF4444;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-card: 0 8px 24px rgb(0 0 0 / 0.16);
}
```

- Warna hijau digunakan sebagai aksen aksi utama dan identitas sekolah hanya setelah disetujui.
- Jangan menggunakan warna primer untuk setiap elemen; simpan untuk aksi utama, link penting, dan fokus.
- Border harus cukup terlihat tetapi tidak mendominasi.
- Pastikan kontras teks dan elemen interaktif memenuhi standar aksesibilitas yang layak.

## 3. Tipografi

- Gunakan font sans-serif modern, misalnya Inter atau system font.
- H1: 28–36 px desktop, 24–30 px mobile.
- H2: 22–28 px.
- H3: 18–20 px.
- Body: 14–16 px.
- Caption/helper text: minimal 12–13 px; jangan gunakan ukuran kecil untuk informasi penting.
- Gunakan maksimal 2–3 tingkat ketebalan font dalam satu area.
- Hindari paragraf panjang di dashboard; gunakan heading, ringkasan, dan daftar.

## 4. Layout dan Spacing

- Gunakan sistem spacing berbasis kelipatan 4 atau 8 px.
- Konten halaman publik: lebar maksimal sekitar 1200 px.
- Dashboard desktop: sidebar tetap atau collapsible, topbar ringkas, area konten utama.
- Formulir PPDB: kelompokkan field ke dalam section dan tampilkan indikator progres bila multi-langkah.
- Berikan ruang kosong yang cukup; jangan menumpuk terlalu banyak kartu dalam satu layar.
- Tabel harus memiliki header jelas, row spacing yang nyaman, dan perilaku mobile yang direncanakan.
- Gunakan grid responsif; hindari lebar tetap yang menyebabkan horizontal overflow.

## 5. Pola Navigasi

### Website publik
- Header: logo, navigasi utama, tombol PPDB.
- Navigasi utama: Beranda, Profil, Program Keahlian, Berita/Agenda, PPDB, Kontak.
- Footer: alamat/kontak resmi, tautan penting, dan identitas sekolah.

### Dashboard
- Sidebar: Dashboard, menu sesuai role, Pengaturan/Profil jika diperlukan.
- Topbar: judul halaman, notifikasi jika fitur disepakati, menu akun, logout.
- Breadcrumb hanya jika membantu memahami hierarki.
- Item navigasi aktif harus jelas melalui warna, indikator, dan/atau ikon.

## 6. Komponen UI

- **Button:** Primary, Secondary, Tertiary/Ghost, Danger. Setiap tombol memiliki hover, focus, active, disabled, dan loading state.
- **Form input:** label permanen, helper text jika diperlukan, error text dekat input, dan indikator wajib yang konsisten.
- **Select/date input:** gunakan kontrol yang dapat dioperasikan dengan keyboard.
- **Card:** untuk ringkasan, informasi, dan konten terkait; hindari membungkus semua elemen dengan card.
- **Table:** dukung loading, empty state, error state, pencarian/filter, dan pagination bila dibutuhkan.
- **Badge/status:** selalu menyertakan label teks, misalnya “Perlu Perbaikan”, bukan warna saja.
- **Modal/dialog:** gunakan untuk konfirmasi tindakan penting; jangan gunakan modal untuk setiap detail.
- **Toast/alert:** beri pesan sukses/error yang spesifik dan dapat ditindaklanjuti.
- **File uploader:** tampilkan jenis/ukuran file yang diterima, progres jika ada, nama file, dan cara mengganti/menghapus sebelum dikirim.
- **Empty state:** jelaskan kondisi kosong dan tindakan berikutnya.
- **Skeleton/loading:** gunakan untuk proses yang membutuhkan waktu, tanpa membuat layout meloncat.

## 7. Halaman Kunci

### Beranda publik
- Hero ringkas dengan identitas sekolah dan CTA PPDB.
- Ringkasan program keahlian dan keunggulan sekolah.
- Berita/agenda terbaru.
- Informasi kontak dan footer.
- Hindari carousel otomatis kecuali benar-benar diperlukan.

### PPDB
- Jelaskan persyaratan, tahapan, jadwal, dan dokumen sebelum formulir.
- Pecah formulir panjang menjadi section yang logis.
- Pertahankan input saat validasi gagal.
- Tampilkan ringkasan sebelum pengiriman final.
- Setelah terkirim, tampilkan nomor pendaftaran dan langkah berikutnya.
- Status harus disertai penjelasan dan instruksi tindakan jika ada perbaikan.

### Dashboard admin/panitia
- Ringkasan angka hanya jika berasal dari data aktual.
- Tabel pendaftar dengan pencarian dan filter yang relevan.
- Detail pendaftar menampilkan data dan dokumen sesuai izin.
- Tindakan berisiko seperti menghapus atau mengubah hasil seleksi memerlukan konfirmasi dan otorisasi.

### Dashboard guru
- Tampilkan kelas yang diampu, materi terbaru, tugas, tenggat, dan submission yang perlu diperiksa.
- Buat tindakan “Buat Materi” dan “Buat Tugas” mudah ditemukan.
- Hindari menampilkan data kelas yang bukan kewenangan guru.

### Dashboard siswa
- Tampilkan kelas, materi terbaru, tugas mendatang, status pengumpulan, serta nilai yang telah dipublikasikan.
- Prioritaskan tindakan utama dan tenggat terdekat.
- Jangan tampilkan nilai yang belum dipublikasikan.

## 8. Responsiveness

- **Mobile (<640 px):** satu kolom, navigasi ringkas, tombol utama mudah dijangkau, tabel berubah menjadi daftar/kartu atau menggunakan scroll horizontal yang disengaja.
- **Tablet (640–1023 px):** grid 2 kolom bila sesuai, sidebar dapat diciutkan.
- **Desktop (≥1024 px):** layout multi-kolom dan sidebar penuh jika dibutuhkan.
- Hindari menyembunyikan informasi penting hanya karena ukuran layar kecil.
- Uji formulir, tabel, upload file, dan dashboard pada beberapa lebar layar.

## 9. Accessibility dan Feedback

- Semua input memiliki label yang terhubung.
- Semua fungsi utama dapat diakses dengan keyboard.
- Fokus keyboard terlihat jelas.
- Error menjelaskan masalah dan cara memperbaikinya.
- Jangan mengandalkan warna saja untuk status.
- Gunakan heading secara berurutan dan teks tombol yang deskriptif.
- Tampilkan loading, sukses, gagal, dan empty state secara konsisten.

## 10. Aturan Visual

- Gunakan ikon dari satu pustaka yang konsisten.
- Hindari emoji sebagai ikon antarmuka inti.
- Hindari gradient, glow, blur, animasi, dan bayangan berlebihan.
- Animasi harus singkat dan tidak menghambat interaksi; hormati preferensi reduced motion.
- Gunakan gambar sekolah yang relevan dan teroptimasi.
- Jangan memasukkan data contoh, statistik, berita, atau identitas palsu ke lingkungan produksi.

## 11. Definition of Done UI

- Layout sesuai guideline dan konsisten antarhalaman.
- Tidak ada overflow horizontal yang tidak disengaja.
- Semua state utama tersedia: default, hover/focus, loading, empty, error, success, disabled.
- Formulir memiliki label dan validasi yang jelas.
- Status dapat dipahami tanpa melihat warna saja.
- Tampilan diuji di mobile, tablet, dan desktop.
