import { useEffect, useState } from 'react';
import { Alert, Button, Card, EmptyState, Input, Spinner } from './components/ui.jsx';
import { DashboardLayout, PublicLayout } from './layouts.jsx';
import { ContactPage, ContentAdminPage, HomePage, NewsAgendaPage, ProfilePage, ProgramPage } from './ContentPages.jsx';
import { PpdbAdminPage, PpdbInfoPage, PpdbRegistrationPage, PpdbStatusPage } from './PpdbPages.jsx';
import { LmsPage } from './LmsPages.jsx';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';

export default function App() {
  const path = window.location.pathname;
  if (path === '/login') return <LoginPage />;
  if (path === '/profil') return <ProfilePage />;
  if (path === '/program-keahlian') return <ProgramPage />;
  if (path.startsWith('/program/')) return <ProgramPage slug={decodeURIComponent(path.slice('/program/'.length))} />;
  if (path === '/berita-agenda') return <NewsAgendaPage />;
  if (path.startsWith('/berita/')) return <NewsAgendaPage newsSlug={decodeURIComponent(path.slice('/berita/'.length))} />;
  if (path === '/kontak') return <ContactPage />;
  if (path === '/dashboard/content') return <ContentAdminPage />;
  if (path === '/dashboard/admissions') return <PpdbAdminPage />;
  if (path === '/dashboard/classes') return <LmsPage />;
  if (path === '/ppdb') return <PpdbInfoPage />;
  if (path === '/ppdb/daftar') return <PpdbRegistrationPage />;
  if (path === '/ppdb/status') return <PpdbStatusPage />;
  if (path.startsWith('/dashboard')) return <DashboardPage />;
  return <HomePage />;
}

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? 'Login gagal.');
      window.location.assign('/dashboard');
    } catch (requestError) {
      setError(requestError.message || 'API tidak dapat dijangkau. Periksa koneksi lalu coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <PublicLayout compact>
      <section className="login-wrap">
        <Card className="login-card">
          <p className="eyebrow">Area akun</p>
          <h1>Masuk</h1>
          <p className="muted">Gunakan akun yang diberikan oleh sekolah.</p>
          {error && <Alert tone="danger" role="alert">{error}</Alert>}
          <form className="form-stack" onSubmit={handleSubmit}>
            <Input label="Email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input label="Password" type="password" autoComplete="current-password" required maxLength={200} value={password} onChange={(event) => setPassword(event.target.value)} />
            <Button type="submit" disabled={loading}>{loading ? <><Spinner /> Memeriksa…</> : 'Masuk'}</Button>
          </form>
          <a className="back-link" href="/">Kembali ke halaman publik</a>
        </Card>
      </section>
    </PublicLayout>
  );
}

function DashboardPage() {
  const [user, setUser] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    fetch(`${API_URL}/auth/session`, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Sesi tidak aktif. Silakan masuk kembali.');
        return response.json();
      })
      .then((data) => { setUser(data.user); setState('ready'); })
      .catch(() => setState('unauthenticated'));
  }, []);

  if (state === 'loading') return <main className="page-loading"><Spinner /> Memuat sesi…</main>;
  if (state === 'unauthenticated') return <main className="page-loading"><Alert tone="warning">Sesi tidak aktif. <a href="/login">Masuk kembali</a>.</Alert></main>;
  return <DashboardContent user={user} />;
}

function DashboardContent({ user }) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    setLoggingOut(true);
    try {
      await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
      window.location.assign('/');
    } catch {
      setError('Logout gagal. Periksa koneksi lalu coba lagi.');
      setLoggingOut(false);
    }
  }

  return (
    <DashboardLayout user={user} onLogout={logout} loggingOut={loggingOut}>
      <div className="page-heading"><div><p className="eyebrow">Dashboard</p><h1>Selamat datang, {user.displayName}</h1></div></div>
      {error && <Alert tone="danger">{error}</Alert>}
      <EmptyState title="Belum ada aktivitas" description="Konten dan aktivitas untuk akun Anda akan tampil di sini." />
    </DashboardLayout>
  );
}
