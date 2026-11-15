import { useEffect, useState } from 'react';
import { Button } from './components/ui.jsx';
import { API_URL, requestJson } from './content-api.js';
import schoolLogo from './assets/logo-alza.png';

const roleLabels = {
  admin_website: 'Admin Website',
  admin_ppdb: 'Admin PPDB',
  teacher: 'Guru',
  student: 'Siswa',
  applicant: 'Calon Siswa',
};
const roleDescriptions = {
  admin_website: 'Kelola informasi sekolah, program keahlian, berita, dan dokumentasi kegiatan.',
  admin_ppdb: 'Pantau pendaftar, verifikasi dokumen, dan kelola informasi penerimaan siswa.',
  teacher: 'Bagikan materi, susun tugas, dan berikan umpan balik untuk pengumpulan siswa.',
  student: 'Akses materi kelas, kumpulkan tugas, dan pantau hasil pembelajaran Anda.',
  applicant: 'Pantau informasi dan perkembangan proses pendaftaran Anda.',
};

/* ─── NAV ICONS (emoji/unicode, no dependency) ─── */
const navIcons = {
  '/dashboard':          '◉',
  '/dashboard/content':  '✎',
  '/dashboard/gallery':  '▧',
  '/dashboard/users':    '◎',
  '/dashboard/admissions': '📋',
  '/ppdb/status':        '◷',
  '/dashboard/classes':  '▦',
};

export function PublicLayout({ children, compact = false }) {
  return (
    <div className="public-shell">
      <header className="public-header">
        <a className="brand" href="/" aria-label="SMK Al Azhar Plus Bogor, beranda">
          <span className="brand-logo-clip" aria-hidden="true">
            <img className="brand-logo" src={schoolLogo} alt="" />
          </span>
          <span className="brand-name">SMK Al Azhar Plus Bogor</span>
        </a>
        <nav className="public-nav" aria-label="Navigasi utama">
          <a href="/">Beranda</a>
          <a href="/profil">Profil</a>
          <a href="/program-keahlian">Program Keahlian</a>
          <a href="/berita-agenda">Berita/Agenda</a>
          <a href="/galeri">Galeri</a>
          <a href="/ppdb">PPDB</a>
        </nav>
        <div className="header-actions">
          <a className="button button-secondary" href="/ppdb">Daftar PPDB</a>
          <PublicAccountLink />
        </div>
      </header>
      <main className={compact ? 'public-main compact' : 'public-main'}>{children}</main>
      <SchoolFooter />
    </div>
  );
}

function PublicAccountLink() {
  const [destination, setDestination] = useState({ href: '/login', label: 'Masuk' });
  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/auth/session`, { credentials: 'include' }).then(async (r) => {
      if (!r.ok) return;
      const { user } = await r.json();
      if (active) setDestination(user.role === 'applicant'
        ? { href: '/ppdb/status', label: 'Status PPDB' }
        : { href: '/dashboard', label: 'Dashboard' });
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return <a className="button button-primary header-cta" href={destination.href}>{destination.label}</a>;
}

function SchoolFooter() {
  const [contact, setContact] = useState({
    address: 'Jl. Raya Sindang Barang No. 219, Sindangbarang, Bogor Barat, Kota Bogor, Jawa Barat 16117',
    phone: '0251-8624015',
    email: 'smkalazharplusbogor@yahoo.com',
    websiteUrl: 'http://www.alazharplusbogor.sch.id',
  });
  useEffect(() => {
    let active = true;
    requestJson('/content/contact').then((data) => {
      if (active) setContact((c) => ({ ...c, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v)) }));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  return (
    <footer className="site-footer">
      <div className="footer-grid">
        {/* Col 1 — Brand */}
        <section className="footer-school">
          <a className="brand footer-brand" href="/" aria-label="SMK Al Azhar Plus Bogor, beranda">
            <span className="brand-logo-clip" aria-hidden="true"><img className="brand-logo" src={schoolLogo} alt="" /></span>
            <span className="brand-name">SMK Al Azhar Plus Bogor</span>
          </a>
          <p>Sekolah menengah kejuruan swasta di Sindang Barang, Kota Bogor, di bawah naungan Yayasan Pendidikan Al Azhar Plus Bogor.</p>
        </section>

        {/* Col 2 — Navigasi */}
        <section className="footer-column">
          <h2>Navigasi cepat</h2>
          <a href="/">Beranda</a>
          <a href="/profil">Profil sekolah</a>
          <a href="/program-keahlian">Program keahlian</a>
          <a href="/berita-agenda">Berita dan agenda</a>
          <a href="/galeri">Galeri</a>
          <a href="/ppdb">PPDB</a>
        </section>

        {/* Col 3 — Layanan */}
        <section className="footer-column">
          <h2>Akses layanan</h2>
          <a href="/ppdb">PPDB Online</a>
          <a href="/ppdb/daftar">Daftar Sekarang</a>
          <a href="/dashboard/classes">Portal LMS</a>
          <a href="/login">Masuk ke akun</a>
        </section>

        {/* Col 4 — Kontak */}
        <section className="footer-column footer-contact">
          <h2>Informasi kontak</h2>
          {contact?.address && <p>{contact.address}</p>}
          {contact?.phone && <a href={`tel:${contact.phone}`}>{contact.phone}</a>}
          {contact?.email && <a href={`mailto:${contact.email}`}>{contact.email}</a>}
          {contact?.websiteUrl && <a href={contact.websiteUrl} target="_blank" rel="noreferrer">Situs resmi sekolah</a>}
          <p className="footer-hours">Waktu belajar: pagi, 6 hari</p>
        </section>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} SMK Al Azhar Plus Bogor — Kota Bogor, Jawa Barat</span>
        <span>NPSN 20220310 · SMK Swasta</span>
      </div>
    </footer>
  );
}

export function DashboardLayout({ user, onLogout, loggingOut, children }) {
  const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' }).format(new Date());
  const path = window.location.pathname;

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', show: true },
    { label: 'Manajemen Konten', href: '/dashboard/content', show: user && user.role === 'admin_website' },
    { label: 'Kelola Galeri', href: '/dashboard/gallery', show: user && user.role === 'admin_website' },
    { label: 'Kelola Pengguna', href: '/dashboard/users', show: user && ['admin_website', 'admin_ppdb'].includes(user.role) },
    { label: 'Penerimaan Siswa', href: '/dashboard/admissions', show: user && user.role === 'admin_ppdb' },
    { label: 'Status Pendaftaran', href: '/ppdb/status', show: user && user.role === 'applicant' },
    { label: user?.role === 'admin_website' ? 'Pengaturan LMS' : 'Kelas & Pembelajaran', href: '/dashboard/classes', show: user && ['admin_website', 'teacher', 'student'].includes(user.role) },
  ].filter((item) => item.show);

  return (
    <div className="dashboard-shell">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-inner">
          <a className="brand sidebar-brand" href="/">
            <span className="brand-logo-clip" aria-hidden="true"><img className="brand-logo" src={schoolLogo} alt="" /></span>
            <span className="brand-name">SMK Al Azhar Plus</span>
          </a>
          <p className="sidebar-label">Menu utama</p>
          <nav className="side-nav" aria-label="Navigasi dashboard">
            {navItems.map((item) => (
              <a
                key={item.href}
                className={path === item.href || (item.href !== '/dashboard' && path.startsWith(item.href)) ? 'active' : ''}
                href={item.href}
              >
                <span aria-hidden="true" style={{ fontSize: '15px' }}>{navIcons[item.href] ?? '·'}</span>
                {item.label}
              </a>
            ))}
          </nav>
        </div>
        <div className="sidebar-footer">
          <a className="sidebar-public-link" href="/">
            <span aria-hidden="true">↗</span> Lihat Website Publik
          </a>
          <Button variant="secondary" onClick={onLogout} disabled={loggingOut} style={{ width: '100%' }}>
            {loggingOut ? 'Keluar…' : '⎋ Keluar'}
          </Button>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <a className="mobile-brand" href="/">SMK Al Azhar Plus Bogor</a>
          <div className="dashboard-date">
            <span>{today}</span>
            <strong>Tahun Ajaran 2026/2027 Aktif</strong>
          </div>
          <div className="account-summary">
            <span className="account-name">{user.displayName}</span>
            <span className="account-role">{roleLabels[user.role] ?? 'Pengguna'}</span>
          </div>
        </header>

        <main className="dashboard-content">
          {/* Welcome banner */}
          <section className="dashboard-welcome" aria-label="Ringkasan dashboard">
            <div>
              <p className="dashboard-welcome-kicker">Ruang kerja · SMK Al Azhar Plus Bogor</p>
              <h1>Selamat datang, {user?.displayName || 'Pengguna'} 👋</h1>
              <p>{roleDescriptions[user?.role] || 'Akses layanan sekolah sesuai peran akun Anda.'}</p>
            </div>
            <span className="dashboard-role-badge">{roleLabels[user?.role] ?? 'Pengguna'}</span>
          </section>
          {children}
        </main>
        <SchoolFooter />
      </div>
    </div>
  );
}

export function DashboardStatCards({ items = [] }) {
  return (
    <section className="dashboard-stats" aria-label="Ringkasan angka">
      {items.map((item, index) => (
        <article className={`dashboard-stat dashboard-stat-${index % 4}`} key={item.label}>
          <span className="dashboard-stat-icon" aria-hidden="true">{item.icon ?? ['◉', '▦', '✓', '◷'][index % 4]}</span>
          <div>
            <p>{item.label}</p>
            <strong>{item.value ?? 0}</strong>
          </div>
        </article>
      ))}
    </section>
  );
}
