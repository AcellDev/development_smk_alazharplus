import { useEffect, useState } from 'react';
import { Alert, Button, Card, EmptyState, Input, Spinner, TextArea } from './components/ui.jsx';
import { DashboardLayout, PublicLayout } from './layouts.jsx';
import { mediaUrl, requestJson } from './content-api.js';

function useContent(path) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => {
    let active = true;
    requestJson(path).then((data) => active && setState({ loading: false, data, error: '' }))
      .catch((error) => active && setState({ loading: false, data: null, error: error.message }));
    return () => { active = false; };
  }, [path]);
  return state;
}

function PublicState({ state, children, emptyTitle = 'Konten belum tersedia' }) {
  if (state.loading) return <div className="state-wrap"><Spinner /> Memuat konten…</div>;
  if (state.error) return <Alert tone="danger" role="alert">{state.error}</Alert>;
  if (state.data == null) return <EmptyState title={emptyTitle} description="Konten resmi akan ditampilkan setelah diterbitkan oleh admin sekolah." />;
  return children(state.data);
}

function PageIntro({ eyebrow, title, description }) {
  return <header className="content-page-intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{description && <p className="muted">{description}</p>}</header>;
}

function ContentCard({ item, href, date }) {
  const image = mediaUrl(item.mediaAssetId);
  return <Card className="content-card">
    {image && <img className="content-image" src={image} alt="" loading="lazy" />}
    {date && <p className="content-date">{date}</p>}
    <h2>{href ? <a href={href}>{item.title ?? item.name}</a> : (item.title ?? item.name)}</h2>
    <p>{item.summary || item.description || item.body || 'Informasi selengkapnya akan tersedia setelah konten diterbitkan.'}</p>
    {href && <a className="text-link" href={href}>Baca selengkapnya</a>}
  </Card>;
}

export function HomePage() {
  const state = useContent('/content/home');
  return <PublicLayout><PublicState state={state}>{(data) => <>
    <section className="hero">
      <p className="eyebrow">SMK Al Azhar Plus Bogor</p>
      <h1>{data.profile?.title ?? 'Selamat datang'}</h1>
      <p className="hero-copy">{data.profile?.content ?? 'Informasi resmi sekolah akan ditampilkan di halaman ini.'}</p>
      <div className="button-row"><a className="button button-primary" href="/ppdb">Informasi PPDB</a><a className="button button-secondary" href="/program-keahlian">Program Keahlian</a></div>
    </section>
    <section className="public-section" id="program"><div className="section-heading"><div><p className="eyebrow">Pilihan pendidikan</p><h2>Program Keahlian</h2></div><a className="text-link" href="/program-keahlian">Lihat semua</a></div>
      {data.programs.length ? <div className="feature-grid">{data.programs.map((item) => <ContentCard key={item.id} item={item} href={`/program/${item.slug}`} />)}</div> : <EmptyState title="Program belum dipublikasikan" description="Informasi program keahlian akan muncul di sini setelah tersedia." />}
    </section>
    <section className="public-section" id="berita"><div className="section-heading"><div><p className="eyebrow">Informasi sekolah</p><h2>Berita terbaru</h2></div><a className="text-link" href="/berita-agenda">Lihat berita dan agenda</a></div>
      {data.news.length ? <div className="feature-grid">{data.news.map((item) => <ContentCard key={item.id} item={item} href={`/berita/${item.slug}`} date={formatDate(item.publishedAt)} />)}</div> : <EmptyState title="Belum ada berita" description="Berita resmi sekolah akan muncul setelah dipublikasikan." />}
    </section>
    <section className="public-section"><div className="section-heading"><div><p className="eyebrow">Jadwal sekolah</p><h2>Agenda mendatang</h2></div></div>
      {data.events.length ? <div className="feature-grid">{data.events.map((event) => <ContentCard key={event.id} item={{ ...event, title: event.title, summary: event.location }} date={formatDate(event.startsAt)} />)}</div> : <EmptyState title="Belum ada agenda" description="Agenda resmi sekolah akan tampil di sini jika sudah tersedia." />}
    </section>
    <section className="ppdb-callout" id="ppdb"><h2>Informasi PPDB</h2><p>Informasi penerimaan peserta didik baru dari sekolah.</p><a className="text-link" href="/ppdb">Lihat periode, jadwal, dan persyaratan</a></section>
  </>}</PublicState></PublicLayout>;
}

export function ProfilePage() {
  const state = useContent('/content/profiles');
  return <PublicLayout><PageIntro eyebrow="Tentang sekolah" title="Profil Sekolah" description="Informasi profil yang diterbitkan oleh sekolah." />
    <PublicState state={state}>{(items) => items.length ? <div className="prose-list">{items.map((item) => <article className="profile-section" key={item.id}>
      {item.mediaAssetId && <img className="profile-image" src={mediaUrl(item.mediaAssetId)} alt="" />}
      <h2>{item.title}</h2><div className="formatted-copy">{item.content}</div>
    </article>)}</div> : <EmptyState title="Profil belum tersedia" description="Informasi sejarah, visi-misi, dan fasilitas belum diterbitkan." />}</PublicState>
  </PublicLayout>;
}

export function ProgramPage({ slug }) {
  const state = useContent(slug ? `/content/programs/${encodeURIComponent(slug)}` : '/content/programs');
  return <PublicLayout><PageIntro eyebrow="Pendidikan" title={slug ? 'Program Keahlian' : 'Program Keahlian'} description="Informasi program keahlian yang diterbitkan sekolah." />
    <PublicState state={state}>{(data) => slug ? <article className="detail-content">
      {data.mediaAssetId && <img className="detail-image" src={mediaUrl(data.mediaAssetId)} alt="" />}
      <h2>{data.name}</h2>{data.summary && <p className="lead-copy">{data.summary}</p>}<div className="formatted-copy">{data.description}</div>
    </article> : data.length ? <div className="feature-grid">{data.map((item) => <ContentCard key={item.id} item={item} href={`/program/${item.slug}`} />)}</div> : <EmptyState title="Program belum tersedia" description="Program keahlian akan muncul setelah diterbitkan oleh sekolah." />}</PublicState>
  </PublicLayout>;
}

export function NewsAgendaPage({ newsSlug }) {
  const news = useContent(newsSlug ? `/content/news/${encodeURIComponent(newsSlug)}` : '/content/news');
  const events = useContent('/content/events');
  return <PublicLayout><PageIntro eyebrow="Kabar sekolah" title={newsSlug ? 'Berita' : 'Berita dan Agenda'} description="Berita dan agenda resmi sekolah." />
    {newsSlug ? <PublicState state={news}>{(item) => <article className="detail-content">
      {item.mediaAssetId && <img className="detail-image" src={mediaUrl(item.mediaAssetId)} alt="" />}
      <p className="content-date">{formatDate(item.publishedAt)}</p><h2>{item.title}</h2>{item.summary && <p className="lead-copy">{item.summary}</p>}<div className="formatted-copy">{item.body}</div>
    </article>}</PublicState> : <>
      <section className="public-section"><h2>Berita</h2><PublicState state={news}>{(items) => items.length ? <div className="feature-grid">{items.map((item) => <ContentCard key={item.id} item={item} href={`/berita/${item.slug}`} date={formatDate(item.publishedAt)} />)}</div> : <EmptyState title="Belum ada berita" description="Berita sekolah yang sudah dipublikasikan akan tampil di sini." />}</PublicState></section>
      <section className="public-section"><h2>Agenda</h2><PublicState state={events}>{(items) => items.length ? <div className="feature-grid">{items.map((event) => <ContentCard key={event.id} item={{ ...event, summary: event.location }} date={formatDate(event.startsAt)} />)}</div> : <EmptyState title="Belum ada agenda" description="Agenda sekolah yang sudah dipublikasikan akan tampil di sini." />}</PublicState></section>
    </>}
  </PublicLayout>;
}

export function ContactPage() {
  const state = useContent('/content/contact');
  return <PublicLayout><PageIntro eyebrow="Hubungi sekolah" title="Kontak" description="Informasi kontak resmi SMK Al Azhar Plus Bogor." />
    <PublicState state={state}>{(contact) => {
      const entries = [['Alamat', contact.address], ['Telepon', contact.phone], ['Email', contact.email], ['Website', contact.websiteUrl]] .filter(([, value]) => value);
      return entries.length || contact.mapUrl ? <div className="contact-grid"><Card><h2>Informasi kontak</h2>{entries.length ? <dl className="contact-list">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{label === 'Email' ? <a href={`mailto:${value}`}>{value}</a> : label === 'Telepon' ? <a href={`tel:${value}`}>{value}</a> : label === 'Website' ? <a href={value} rel="noreferrer">{value}</a> : value}</dd></div>)}</dl> : <p>Informasi alamat dan kontak belum diisi.</p>}{contact.mapUrl && <a className="button button-secondary" href={contact.mapUrl} target="_blank" rel="noreferrer">Buka peta</a>}</Card></div> : <EmptyState title="Informasi kontak belum tersedia" description="Sekolah belum menerbitkan detail alamat atau kontak." />;
    }}</PublicState>
  </PublicLayout>;
}

const resourceLabels = { profiles: 'Halaman profil', programs: 'Program keahlian', news: 'Berita', events: 'Agenda', contact: 'Kontak' };
const fields = {
  profiles: [['title', 'Judul'], ['slug', 'Slug'], ['body', 'Isi'], ['mediaAssetId', 'ID aset gambar']],
  programs: [['title', 'Nama program'], ['slug', 'Slug'], ['summary', 'Ringkasan'], ['body', 'Deskripsi'], ['displayOrder', 'Urutan tampil'], ['mediaAssetId', 'ID aset gambar']],
  news: [['title', 'Judul'], ['slug', 'Slug'], ['summary', 'Ringkasan'], ['body', 'Isi berita'], ['mediaAssetId', 'ID aset gambar']],
  events: [['title', 'Nama agenda'], ['location', 'Lokasi'], ['startsAt', 'Waktu mulai'], ['endsAt', 'Waktu selesai'], ['body', 'Deskripsi'], ['mediaAssetId', 'ID aset gambar']],
  contact: [['address', 'Alamat'], ['phone', 'Telepon'], ['email', 'Email'], ['websiteUrl', 'URL website'], ['mapUrl', 'URL peta']],
};

function emptyDraft(resource) {
  return Object.fromEntries(fields[resource].map(([key]) => [key, '']));
}

export function ContentAdminPage() {
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState('loading');
  useEffect(() => {
    requestJson('/auth/session').then(({ user: currentUser }) => {
      if (currentUser.role !== 'admin_website') throw new Error('Halaman ini hanya tersedia untuk admin website.');
      setUser(currentUser); setAuthState('ready');
    }).catch(() => setAuthState('denied'));
  }, []);
  if (authState === 'loading') return <main className="page-loading"><Spinner /> Memeriksa akses…</main>;
  if (authState === 'denied') return <main className="page-loading"><Alert tone="warning">Akses admin website diperlukan. <a href="/login">Masuk</a>.</Alert></main>;
  return <ContentAdmin user={user} />;
}

function ContentAdmin({ user }) {
  const [resource, setResource] = useState('profiles');
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState(emptyDraft('profiles'));
  const [selectedId, setSelectedId] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function loadItems(nextResource = resource) {
    setLoading(true); setError('');
    try {
      const data = await requestJson(`/content/admin/${nextResource}`);
      setItems(nextResource === 'contact' ? (Object.keys(data).length ? [data] : []) : data);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadItems(resource); }, [resource]);

  function startNew() {
    setSelectedId(null); setDraft(emptyDraft(resource)); setIsPublished(false); setError(''); setNotice('');
  }
  function editItem(item) {
    setSelectedId(item.id ?? 'contact');
    const nextDraft = emptyDraft(resource);
    for (const [key] of fields[resource]) {
      if (key === 'title' && resource === 'programs') nextDraft[key] = item.name ?? '';
      else nextDraft[key] = key === 'body' ? (item.content ?? item.body ?? item.description ?? '') : (item[key] ?? '');
    }
    if (resource === 'profiles') nextDraft.body = item.content ?? '';
    if (resource === 'programs') nextDraft.body = item.description ?? '';
    if (resource === 'news') nextDraft.body = item.body ?? '';
    if (resource === 'events') nextDraft.body = item.description ?? '';
    if (resource === 'events') {
      nextDraft.startsAt = toLocalDateTime(item.startsAt); nextDraft.endsAt = toLocalDateTime(item.endsAt);
    }
    setDraft(nextDraft); setIsPublished(resource === 'news' ? item.isPublished : Boolean(item.isPublished)); setError(''); setNotice('');
  }
  function changeResource(value) {
    setResource(value); setDraft(emptyDraft(value)); setSelectedId(null); setIsPublished(false); setNotice('');
  }

  async function uploadImage(file) {
    if (!file) return;
    setError(''); setNotice('Mengunggah gambar…');
    const form = new FormData(); form.append('file', file);
    try {
      const asset = await requestJson('/content/media', { method: 'POST', body: form });
      setDraft((current) => ({ ...current, mediaAssetId: asset.id }));
      setNotice(`Gambar tersimpan. ID aset: ${asset.id}`);
    } catch (uploadError) { setError(uploadError.message); setNotice(''); }
  }

  async function save(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const payload = { ...draft, isPublished };
    if (resource === 'profiles') payload.content = payload.body;
    if (resource === 'programs') payload.description = payload.body;
    if (resource === 'events') payload.description = payload.body;
    if (resource === 'events') {
      payload.startsAt = payload.startsAt ? new Date(payload.startsAt).toISOString() : null;
      payload.endsAt = payload.endsAt ? new Date(payload.endsAt).toISOString() : null;
    }
    try {
      await requestJson(resource === 'contact' ? '/content/admin/contact' : `/content/admin/${resource}${selectedId ? `/${selectedId}` : ''}`, {
        method: resource === 'contact' || !selectedId ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      setNotice('Konten berhasil disimpan.'); setSelectedId(resource === 'contact' ? 'contact' : null);
      if (resource !== 'contact') setDraft(emptyDraft(resource));
      await loadItems(resource);
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }

  async function removeItem(item) {
    if (!window.confirm(`Hapus “${item.title ?? item.name ?? resourceLabels[resource]}”?`)) return;
    try {
      await requestJson(`/content/admin/${resource}/${item.id}`, { method: 'DELETE' });
      setNotice('Konten berhasil dihapus.'); startNew(); await loadItems(resource);
    } catch (deleteError) { setError(deleteError.message); }
  }

  async function logout() {
    await requestJson('/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.assign('/');
  }

  return <DashboardLayout user={user} onLogout={logout} loggingOut={false}>
    <div className="page-heading"><div><p className="eyebrow">Company profile</p><h1>Manajemen konten</h1></div><Button variant="secondary" onClick={startNew}>Konten baru</Button></div>
    <div className="content-admin-grid">
      <section className="admin-list surface-card">
        <div className="field"><label htmlFor="content-resource">Jenis konten</label><select id="content-resource" className="input" value={resource} onChange={(event) => changeResource(event.target.value)}>{Object.entries(resourceLabels).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></div>
        {loading ? <p className="muted list-feedback"><Spinner /> Memuat…</p> : resource === 'contact' ? <p className="muted list-feedback">{items.length ? 'Informasi kontak tersimpan' : 'Belum ada informasi kontak'}</p> : items.length ? <div className="admin-item-list">{items.map((item) => <div className="admin-item" key={item.id}><button type="button" className="admin-item-title" onClick={() => editItem(item)}>{item.title ?? item.name}</button><span className="admin-item-status">{resource === 'news' ? (item.isPublished ? 'Terbit' : 'Draf') : (item.isPublished ? 'Terbit' : 'Draf')}</span><Button variant="danger" onClick={() => removeItem(item)}>Hapus</Button></div>)}</div> : <p className="muted list-feedback">Belum ada konten.</p>}
      </section>
      <section className="surface-card editor-card"><h2>{selectedId ? 'Ubah konten' : 'Konten baru'}: {resourceLabels[resource]}</h2>
        {error && <Alert tone="danger" role="alert">{error}</Alert>}{notice && <Alert tone="info" role="status">{notice}</Alert>}
        <form className="form-stack" onSubmit={save}>
          {fields[resource].map(([key, label]) => ['body', 'summary', 'address'].includes(key) ? <TextArea key={key} label={label} required={key === 'body' && resource !== 'contact'} rows={key === 'body' ? 7 : 3} value={draft[key] ?? ''} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} /> : <Input key={key} label={label} required={key === 'title'} type={['startsAt', 'endsAt'].includes(key) ? 'datetime-local' : key === 'displayOrder' ? 'number' : 'text'} value={draft[key] ?? ''} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))} />)}
          {['profiles', 'programs', 'news', 'events'].includes(resource) && <label className="check-field"><input type="checkbox" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} /> Terbitkan konten</label>}
          {['profiles', 'programs', 'news', 'events'].includes(resource) && <div className="field"><label htmlFor="content-image">Gambar (JPEG, PNG, WebP; maks. 5 MB)</label><input id="content-image" className="input file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => uploadImage(event.target.files?.[0])} /><small className="muted">ID aset saat ini: {draft.mediaAssetId || 'belum dipilih'}</small></div>}
          <div className="button-row"><Button type="submit" disabled={saving}>{saving ? <><Spinner /> Menyimpan…</> : 'Simpan'}</Button><Button type="button" variant="secondary" onClick={startNew}>Batal</Button></div>
        </form>
      </section>
    </div>
  </DashboardLayout>;
}

function formatDate(value) {
  if (!value) return 'Tanggal belum ditentukan';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' }).format(new Date(value));
}

function toLocalDateTime(value) {
  if (!value) return '';
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
