import { useEffect, useState } from 'react';
import { Button } from './components/ui.jsx';
import { API_URL } from './content-api.js';
import schoolLogo from './assets/logo-alza.png';

const roleLabels = {
  admin_website: 'Admin website', admin_ppdb: 'Admin PPDB', teacher: 'Guru', student: 'Siswa', applicant: 'Calon siswa',
};

export function PublicLayout({ children, compact = false }) {
  return (
    <div className="public-shell">
      <header className="public-header">
        <a className="brand" href="/" aria-label="SMK Al Azhar Plus Bogor, beranda"><span className="brand-logo-clip" aria-hidden="true"><img className="brand-logo" src={schoolLogo} alt="" /></span><span className="brand-name">SMK Al Azhar Plus Bogor</span></a>
        <nav className="public-nav" aria-label="Navigasi utama">
          <a href="/">Beranda</a><a href="/profil">Profil</a><a href="/program-keahlian">Program Keahlian</a><a href="/berita-agenda">Berita/Agenda</a><a href="/ppdb">PPDB</a><a href="/kontak">Kontak</a>
        </nav>
        <PublicAccountLink />
      </header>
      <main className={compact ? 'public-main compact' : 'public-main'}>{children}</main>
      <footer className="public-footer"><span>SMK Al Azhar Plus Bogor</span><a href="/#kontak">Kontak sekolah</a></footer>
    </div>
  );
}

function PublicAccountLink() {
  const [destination, setDestination] = useState({ href: '/login', label: 'Masuk' });
  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/auth/session`, { credentials: 'include' }).then(async (response) => {
      if (!response.ok) return;
      const { user } = await response.json();
      if (active) setDestination(user.role === 'applicant'
        ? { href: '/ppdb/status', label: 'Status PPDB' }
        : { href: '/dashboard', label: 'Dashboard' });
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  return <a className="button button-primary header-cta" href={destination.href}>{destination.label}</a>;
}

export function DashboardLayout({ user, onLogout, loggingOut, children }) {
  const navItems = [
    { label: 'Dashboard', href: '/dashboard', show: true },
    { label: 'Manajemen konten', href: '/dashboard/content', show: user && user.role === 'admin_website' },
    { label: 'Penerimaan siswa', href: '/dashboard/admissions', show: user && user.role === 'admin_ppdb' },
    { label: 'Status pendaftaran', href: '/ppdb/status', show: user && user.role === 'applicant' },
    { label: user?.role === 'admin_website' ? 'Pengaturan kelas' : 'Kelas dan pembelajaran', href: '/dashboard/classes', show: user && ['admin_website', 'teacher', 'student'].includes(user.role) },
  ].filter((item) => item.show);

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <a className="brand sidebar-brand" href="/"><span className="brand-logo-clip" aria-hidden="true"><img className="brand-logo" src={schoolLogo} alt="" /></span><span className="brand-name">SMK Al Azhar Plus Bogor</span></a>
        <p className="sidebar-label">MENU</p>
        <nav className="side-nav" aria-label="Navigasi dashboard">
          {navItems.map((item) => <a key={item.href} className={window.location.pathname === item.href ? 'active' : ''} href={item.href}>{item.label}</a>)}
        </nav>
      </aside>
      <div className="dashboard-main">
        <header className="dashboard-topbar">
          <a className="mobile-brand" href="/">SMK Al Azhar Plus Bogor</a>
          <div className="account-summary"><span className="account-name">{user.displayName}</span><span className="account-role">{roleLabels[user.role] ?? 'Pengguna'}</span><Button variant="secondary" onClick={onLogout} disabled={loggingOut}>{loggingOut ? 'Keluar…' : 'Keluar'}</Button></div>
        </header>
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
