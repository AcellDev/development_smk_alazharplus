import { useEffect, useState } from 'react';
import { Alert, Button, Card, EmptyState, Spinner } from './components/ui.jsx';
import { DashboardLayout, DashboardStatCards } from './layouts.jsx';
import { GALLERY_CATEGORIES, galleryApi, requestJson } from './content-api.js';

const emptyForm = { title: '', category: GALLERY_CATEGORIES[0], imageUrl: '', activityDate: '', description: '' };

function artClass(category) {
  return ({
    'Kegiatan belajar': 'classroom',
    'Laboratorium & praktik': 'practice',
    Ekstrakurikuler: 'community',
    'Acara sekolah': 'event',
  })[category] ?? 'classroom';
}

export function GalleryAdminPage() {
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState('loading');
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ stories: 0, programs: 0 });
  const [loadingItems, setLoadingItems] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadItems() {
    setLoadingItems(true);
    try { setItems(await galleryApi.list()); }
    catch (requestError) { setError(requestError.message); }
    finally { setLoadingItems(false); }
  }

  useEffect(() => {
    requestJson('/auth/session').then(({ user: currentUser }) => {
      if (currentUser.role !== 'admin_website') throw new Error('Halaman ini hanya tersedia untuk admin website.');
      setUser(currentUser);
      setAuthState('ready');
      loadItems();
      Promise.all([requestJson('/content/admin/news'), requestJson('/content/admin/events'), requestJson('/content/admin/programs')]).then(([news, events, programs]) => setSummary({ stories: news.length + events.length, programs: programs.length })).catch(() => {});
    }).catch(() => setAuthState('denied'));
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setNotice('');
  }

  function beginEdit(item) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      category: item.category,
      imageUrl: item.imageUrl ?? '',
      activityDate: item.activityDate?.slice(0, 10) ?? '',
      description: item.description,
    });
    setError('');
    setNotice('');
  }

  async function saveItem(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      if (editingId) await galleryApi.update(editingId, form);
      else await galleryApi.create(form);
      setNotice(editingId ? 'Item galeri berhasil diperbarui.' : 'Item galeri berhasil ditambahkan.');
      setEditingId(null);
      setForm(emptyForm);
      await loadItems();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }

  async function removeItem(item) {
    if (!window.confirm(`Hapus “${item.title}” dari galeri?`)) return;
    setError('');
    setNotice('');
    try {
      await galleryApi.remove(item.id);
      if (editingId === item.id) resetForm();
      setNotice('Item galeri berhasil dihapus.');
      await loadItems();
    } catch (requestError) { setError(requestError.message); }
  }

  async function logout() {
    await requestJson('/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.assign('/');
  }

  if (authState === 'loading') return <main className="page-loading"><Spinner /> Memeriksa akses…</main>;
  if (authState === 'denied') return <main className="page-loading"><Alert tone="warning">Akses admin website diperlukan. <a href="/login">Masuk</a>.</Alert></main>;

  return <DashboardLayout user={user} onLogout={logout} loggingOut={false}>
    <div className="page-heading"><div><p className="eyebrow">Company profile</p><h1>Manajemen galeri</h1></div><Button variant="secondary" onClick={resetForm}>Item baru</Button></div>
    <DashboardStatCards items={[{ label: 'Total berita & agenda', value: summary.stories, icon: '▤' }, { label: 'Program keahlian', value: summary.programs, icon: '▦' }, { label: 'Dokumentasi galeri', value: items.length, icon: '▧' }]} />
    <nav className="workspace-tabs" aria-label="Kelola company profile"><a href="/dashboard/content?resource=news">Kelola Konten &amp; Berita</a><a href="/dashboard/content?resource=programs">Program Keahlian</a><a className="selected" href="/dashboard/gallery" aria-current="page">Kelola Galeri</a></nav>
    <p className="muted gallery-admin-intro">Kelola foto, tanggal, dan deskripsi galeri kegiatan sekolah.</p>
    {error && <Alert tone="danger" role="alert">{error}</Alert>}
    {notice && <Alert tone="info" role="status">{notice}</Alert>}
    <div className="gallery-admin-layout">
      <Card className="gallery-admin-form-card">
        <h2>{editingId ? 'Edit item galeri' : 'Tambah item galeri'}</h2>
        <form className="form-stack" onSubmit={saveItem}>
          <div className="field"><label htmlFor="gallery-title">Judul</label><input id="gallery-title" className="input" required maxLength={180} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></div>
          <div className="field"><label htmlFor="gallery-category">Kategori kegiatan</label><select id="gallery-category" className="input" required value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{GALLERY_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
          <div className="field"><label htmlFor="gallery-image-url">URL gambar</label><input id="gallery-image-url" className="input" type="url" maxLength={2048} placeholder="https://…" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} /><small className="muted">Kosongkan untuk memakai visual ilustrasi kategori.</small></div>
          <div className="field"><label htmlFor="gallery-activity-date">Tanggal kegiatan</label><input id="gallery-activity-date" className="input" type="date" value={form.activityDate} onChange={(event) => setForm({ ...form, activityDate: event.target.value })} /></div>
          <div className="field"><label htmlFor="gallery-description">Deskripsi</label><textarea id="gallery-description" className="input textarea" required maxLength={3000} rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></div>
          <div className="button-row"><Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : editingId ? 'Simpan perubahan' : 'Tambah galeri'}</Button>{editingId && <Button type="button" variant="secondary" onClick={resetForm}>Batal</Button>}</div>
        </form>
      </Card>
      <Card className="gallery-admin-items-card">
        <div className="gallery-admin-list-heading"><div><h2>Daftar galeri</h2><p>{items.length} item tersimpan</p></div></div>
        {loadingItems ? <div className="state-wrap"><Spinner /> Memuat galeri…</div> : items.length ? <div className="gallery-admin-list">{items.map((item) => <article className="gallery-admin-item" key={item.id}>
          {item.imageUrl ? <img className="gallery-admin-thumb" src={item.imageUrl} alt="" loading="lazy" /> : <div className={`gallery-admin-thumb gallery-admin-thumb-${artClass(item.category)}`} aria-hidden="true"><span>{item.category}</span></div>}
          <div className="gallery-admin-item-copy"><span className="gallery-category">{item.category}</span><h3>{item.title}</h3><p>{item.description}</p>{item.activityDate && <small>{item.activityDate}</small>}</div>
          <div className="gallery-admin-actions"><Button variant="secondary" onClick={() => beginEdit(item)}>Edit</Button><Button variant="danger" onClick={() => removeItem(item)}>Hapus</Button></div>
        </article>)}</div> : <EmptyState title="Galeri masih kosong" description="Tambahkan foto atau visual kegiatan menggunakan formulir ini." />}
      </Card>
    </div>
  </DashboardLayout>;
}
