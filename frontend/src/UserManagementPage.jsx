import { useEffect, useState } from 'react';
import { Alert, Button, Card, EmptyState, Input, Spinner } from './components/ui.jsx';
import { DashboardLayout, DashboardStatCards } from './layouts.jsx';
import { requestJson } from './content-api.js';

const roleOptions = [
  ['siswa', 'Siswa'], ['guru', 'Guru'], ['admin_ppdb', 'Admin PPDB'], ['admin_website', 'Admin Website'],
];
const blank = { displayName: '', email: '', role: 'siswa', password: '' };

export function UserManagementPage() {
  const [user, setUser] = useState(null);
  const [auth, setAuth] = useState('loading');
  const [users, setUsers] = useState([]);
  const [filterRole, setFilterRole] = useState('');
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadUsers(role = filterRole) {
    setLoading(true); setError('');
    try {
      const query = role ? `?role=${encodeURIComponent(role)}` : '';
      setUsers(await requestJson(`/users${query}`));
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    requestJson('/auth/session').then(({ user: current }) => {
      if (!['admin_website', 'admin_ppdb'].includes(current.role)) throw new Error('Halaman ini hanya tersedia untuk admin website dan admin PPDB.');
      setUser(current); setAuth('ready');
    }).catch(() => setAuth('denied'));
  }, []);
  useEffect(() => { if (auth === 'ready') loadUsers(filterRole); }, [auth, filterRole]);

  function resetForm() { setEditingId(''); setForm(blank); setError(''); setNotice(''); }
  function edit(item) {
    setEditingId(item.id);
    setForm({ displayName: item.displayName, email: item.email, role: item.role, password: '' });
    setError(''); setNotice('');
  }

  async function save(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const payload = { ...form };
    if (editingId && !payload.password) delete payload.password;
    try {
      await requestJson(editingId ? `/users/${editingId}` : '/users', {
        method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      setNotice(editingId ? 'Data pengguna berhasil diperbarui.' : 'Akun baru berhasil dibuat.');
      resetForm(); await loadUsers();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }

  async function resetPassword(item) {
    if (!window.confirm(`Reset password ${item.displayName} menjadi login123?`)) return;
    try {
      await requestJson(`/users/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'login123' }) });
      setNotice(`Password ${item.displayName} direset. Password awal: login123.`); setError('');
    } catch (requestError) { setError(requestError.message); }
  }

  async function remove(item) {
    if (!window.confirm(`Nonaktifkan akun ${item.displayName}? Riwayat pembelajaran dan pendaftaran akan tetap disimpan.`)) return;
    try {
      await requestJson(`/users/${item.id}`, { method: 'DELETE' });
      setNotice(`Akun ${item.displayName} dinonaktifkan.`); setError(''); await loadUsers();
    } catch (requestError) { setError(requestError.message); }
  }

  async function logout() { await requestJson('/auth/logout', { method: 'POST' }).catch(() => {}); window.location.assign('/'); }

  if (auth === 'loading') return <main className="page-loading"><Spinner /> Memeriksa akses…</main>;
  if (auth === 'denied') return <main className="page-loading"><Alert tone="warning">Akses administrator diperlukan. <a href="/login">Masuk</a>.</Alert></main>;
  const studentCount = users.filter((item) => item.role === 'siswa').length;
  const teacherCount = users.filter((item) => item.role === 'guru').length;
  const administratorCount = users.filter((item) => ['admin_website', 'admin_ppdb'].includes(item.role)).length;

  return <DashboardLayout user={user} onLogout={logout} loggingOut={false}>
    <div className="page-heading"><div><p className="eyebrow">Akun dan akses</p><h1>Kelola Pengguna</h1></div></div>
    <DashboardStatCards items={[{ label: 'Total pengguna sistem', value: users.length, icon: '◎' }, { label: 'Siswa', value: studentCount, icon: '▦' }, { label: 'Guru', value: teacherCount, icon: '▤' }, { label: 'Administrator', value: administratorCount, icon: '✓' }]} />
    {error && <Alert tone="danger" role="alert">{error}</Alert>}{notice && <Alert tone="info" role="status">{notice}</Alert>}
    <div className="users-admin-layout">
      <Card className="users-form-card"><p className="eyebrow">{editingId ? 'Perbarui akses' : 'Akun baru'}</p><h2>{editingId ? 'Edit pengguna' : 'Tambah pengguna'}</h2>
        <form className="form-stack" onSubmit={save}>
          <Input label="Nama lengkap" required maxLength={160} autoComplete="name" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} />
          <Input label="Email" type="email" required maxLength={254} autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          <div className="field"><label htmlFor="user-role">Role akun</label><select id="user-role" className="input" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>{roleOptions.map(([role, label]) => <option value={role} key={role}>{label}</option>)}</select></div>
          <Input label={editingId ? 'Password baru (opsional)' : 'Password'} type="password" required={!editingId} minLength={8} maxLength={72} autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          {editingId && <p className="muted users-password-note">Kosongkan password jika tidak ingin mengubahnya. Reset cepat tersedia di daftar akun.</p>}
          <div className="button-row"><Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : editingId ? 'Simpan perubahan' : 'Buat akun'}</Button>{editingId && <Button type="button" variant="secondary" onClick={resetForm}>Batal</Button>}</div>
        </form>
      </Card>
      <Card className="users-list-card"><div className="section-heading"><div><p className="eyebrow">Direktori akun</p><h2>Daftar pengguna</h2></div><span className="badge badge-neutral">{users.length} akun</span></div>
        <div className="users-filter"><div className="field"><label htmlFor="users-role-filter">Filter role</label><select id="users-role-filter" className="input" value={filterRole} onChange={(event) => setFilterRole(event.target.value)}><option value="">Semua role</option>{roleOptions.map(([role, label]) => <option value={role} key={role}>{label}</option>)}</select></div></div>
        {loading ? <div className="state-wrap"><Spinner /> Memuat pengguna…</div> : users.length ? <div className="users-table-wrap"><table className="users-table"><thead><tr><th>Pengguna</th><th>Role</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{users.map((item) => <tr key={item.id}><td><strong>{item.displayName}</strong><small>{item.email}</small></td><td><span className={`role-chip role-chip-${item.role}`}>{roleOptions.find(([role]) => role === item.role)?.[1] ?? (item.role === 'calon_siswa' ? 'Calon Siswa' : item.role)}</span></td><td><span className={`status-label ${item.isActive ? '' : 'status-inactive'}`}>{item.isActive ? 'Aktif' : 'Nonaktif'}</span></td><td><div className="users-row-actions"><Button variant="secondary" onClick={() => edit(item)} disabled={!item.isActive || item.role === 'calon_siswa'}>Edit</Button><Button variant="secondary" onClick={() => resetPassword(item)} disabled={!item.isActive}>Reset Password</Button><Button variant="danger" onClick={() => remove(item)} disabled={!item.isActive}>Hapus</Button></div></td></tr>)}</tbody></table></div> : <EmptyState title="Tidak ada pengguna" description="Belum ada akun pada filter role ini. Tambahkan akun melalui formulir di samping." />}
      </Card>
    </div>
  </DashboardLayout>;
}
