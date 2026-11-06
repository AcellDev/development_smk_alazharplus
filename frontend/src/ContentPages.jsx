import { useEffect, useState } from 'react';
import { Alert, Button, Card, EmptyState, Input, Spinner, TextArea } from './components/ui.jsx';
import { DashboardLayout, DashboardStatCards, PublicLayout } from './layouts.jsx';
import { GALLERY_CATEGORIES, galleryApi, mediaUrl, requestJson } from './content-api.js';

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
      <div className="hero-copy-column">
        <p className="hero-badge"><span className="hero-badge-dot" /> Penerimaan Peserta Didik Baru</p>
        <h1>{data.profile?.title ?? 'Selamat Datang di SMK Al Azhar Plus Bogor'}</h1>
        <p className="hero-copy">{data.profile?.content ?? 'Kenali pendidikan kejuruan, informasi sekolah, dan layanan pembelajaran SMK Al Azhar Plus Bogor.'}</p>
        <div className="button-row"><a className="button button-primary" href="/ppdb">Daftar PPDB</a><a className="button button-secondary" href="/program-keahlian">Jelajahi Jurusan</a></div>
        <div className="hero-facts" aria-label="Informasi sekolah">
          <div><strong>20220310</strong><span>NPSN</span></div><div><strong>SMK Swasta</strong><span>Jenjang pendidikan</span></div><div><strong>Bogor Barat</strong><span>Lokasi sekolah</span></div>
        </div>
      </div>
      <div className="hero-bento" aria-label="Layanan sekolah">
        <a className="hero-pillar hero-pillar-profile" href="/profil"><span className="pillar-index">01 / SEKOLAH</span><span className="pillar-symbol pillar-symbol-school" aria-hidden="true">A+</span><span className="pillar-title">Profil sekolah</span><span className="pillar-copy">Kenali identitas dan informasi sekolah</span><span className="pillar-arrow" aria-hidden="true">↗</span></a>
        <a className="hero-pillar hero-pillar-ppdb" href="/ppdb"><span className="pillar-index">02 / PPDB</span><span className="pillar-symbol pillar-symbol-ppdb" aria-hidden="true">01</span><span className="pillar-title">Status PPDB Online</span><span className="pillar-copy">Lihat periode dan informasi pendaftaran</span><span className="pillar-arrow" aria-hidden="true">↗</span></a>
        <a className="hero-pillar hero-pillar-lms" href="/dashboard/classes"><span className="pillar-index">03 / LMS</span><span className="pillar-symbol pillar-symbol-lms" aria-hidden="true">↗</span><span className="pillar-title">Portal E-Learning</span><span className="pillar-copy">Akses materi dan tugas pembelajaran</span><span className="pillar-arrow" aria-hidden="true">↗</span></a>
      </div>
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

export function GalleryPage() {
  const state = useGalleryItems();
  return <PublicLayout><PageIntro eyebrow="Momen sekolah" title="Galeri" description="Jelajahi suasana belajar, praktik, dan kebersamaan di SMK Al Azhar Plus Bogor." />
    <PublicState state={state} emptyTitle="Galeri belum tersedia">{(items) => <GalleryCollection items={items} />}</PublicState>
  </PublicLayout>;
}

function useGalleryItems() {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => {
    let active = true;
    galleryApi.list().then((data) => active && setState({ loading: false, data, error: '' }))
      .catch((error) => active && setState({ loading: false, data: null, error: error.message }));
    return () => { active = false; };
  }, []);
  return state;
}

function galleryArt(category) {
  return ({
    'Kegiatan belajar': 'classroom',
    'Laboratorium & praktik': 'practice',
    Ekstrakurikuler: 'community',
    'Acara sekolah': 'event',
  })[category] ?? 'classroom';
}

function GalleryCollection({ items }) {
  const [activeCategory, setActiveCategory] = useState('Semua kategori');
  const visibleItems = activeCategory === 'Semua kategori' ? items : items.filter((item) => item.category === activeCategory);
  return <>
    {items.length > 0 && <div className="gallery-filters" role="group" aria-label="Filter kategori galeri">
      {['Semua kategori', ...GALLERY_CATEGORIES].map((category) => <button key={category} type="button" className={`gallery-filter${activeCategory === category ? ' active' : ''}`} aria-pressed={activeCategory === category} onClick={() => setActiveCategory(category)}>{category}</button>)}
    </div>}
    {visibleItems.length ? <div className="gallery-grid">{visibleItems.map((item, index) => <article className="gallery-card" key={item.id}>
      <div className={`gallery-visual gallery-visual-${galleryArt(item.category)}${item.imageUrl ? ' gallery-has-image' : ''}`} role="img" aria-label={item.imageUrl ? item.title : `Ilustrasi ${item.category.toLowerCase()}`}>
        {item.imageUrl && <img className="gallery-photo" src={item.imageUrl} alt={item.title} loading="lazy" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
        <span className="gallery-visual-label">SMK AL AZHAR PLUS BOGOR</span>
        {!item.imageUrl && <><span className="gallery-visual-shape gallery-visual-shape-one" /><span className="gallery-visual-shape gallery-visual-shape-two" /><span className="gallery-visual-number">{String(index + 1).padStart(2, '0')}</span></>}
      </div>
      <div className="gallery-card-copy"><div className="gallery-card-meta"><span className="gallery-category">{item.category}</span>{item.activityDate && <time dateTime={item.activityDate}>{formatDate(item.activityDate)}</time>}</div><h2>{item.title}</h2><p>{item.description}</p></div>
    </article>)}</div> : <EmptyState title={items.length ? 'Belum ada item pada kategori ini' : 'Galeri belum tersedia'} description={items.length ? 'Pilih kategori lain untuk melihat item galeri.' : 'Foto dan informasi kegiatan akan tampil setelah ditambahkan oleh admin sekolah.'} />}
  </>;
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
  const requestedResource = new URLSearchParams(window.location.search).get('resource');
  const [resource, setResource] = useState(Object.hasOwn(resourceLabels, requestedResource) ? requestedResource : 'profiles');
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ stories: 0, programs: 0, galleries: 0 });
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
  useEffect(() => {
    Promise.all([requestJson('/content/admin/news'), requestJson('/content/admin/events'), requestJson('/content/admin/programs'), galleryApi.list()])
      .then(([news, events, programs, galleries]) => setSummary({ stories: news.length + events.length, programs: programs.length, galleries: galleries.length }))
      .catch(() => {});
  }, []);

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
    const url = new URL(window.location.href); url.searchParams.set('resource', value); window.history.replaceState({}, '', url);
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
    <DashboardStatCards items={[{ label: 'Total berita & agenda', value: summary.stories, icon: '▤' }, { label: 'Program keahlian', value: summary.programs, icon: '▦' }, { label: 'Dokumentasi galeri', value: summary.galleries, icon: '▧' }]} />
    <nav className="workspace-tabs" aria-label="Kelola company profile"><a className={['news', 'events', 'profiles', 'contact'].includes(resource) ? 'selected' : ''} href="/dashboard/content?resource=news">Kelola Konten &amp; Berita</a><a className={resource === 'programs' ? 'selected' : ''} href="/dashboard/content?resource=programs">Program Keahlian</a><a href="/dashboard/gallery">Kelola Galeri</a></nav>
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

export function DashboardHomePage({ user }) {
  const [state, setState] = useState({ loading: true, error: '', data: null });
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        let data;
        if (user.role === 'admin_ppdb') data = await requestJson('/ppdb/admin/dashboard');
        else if (user.role === 'admin_website') {
          const [news, events, programs, galleries, users] = await Promise.all([
            requestJson('/content/news'), requestJson('/content/events'), requestJson('/content/admin/programs'), galleryApi.list(), requestJson('/users'),
          ]);
          data = { news, events, programs, galleries, users };
        } else if (user.role === 'teacher') data = await loadTeacherDashboard();
        else if (user.role === 'student') data = await loadStudentDashboard();
        else data = {};
        if (active) setState({ loading: false, error: '', data });
      } catch (error) { if (active) setState({ loading: false, error: error.message, data: null }); }
    }
    load();
    return () => { active = false; };
  }, [user.role]);

  if (state.loading) return <div className="dashboard-data-state"><Spinner /> Memuat ringkasan akun…</div>;
  if (state.error) return <Alert tone="danger" role="alert">{state.error}</Alert>;
  const data = state.data ?? {};
  if (user.role === 'admin_ppdb') return <AdmissionsDashboard data={data} />;
  if (user.role === 'admin_website') return <WebsiteDashboard data={data} />;
  if (user.role === 'teacher') return <TeacherDashboard data={data} />;
  if (user.role === 'student') return <StudentDashboard data={data} />;
  return <div className="dashboard-inline-empty">Pilih menu di samping untuk membuka layanan akun Anda.</div>;
}

async function loadTeacherDashboard() {
  const classes = await requestJson('/lms/teacher/classes');
  const courses = (await Promise.all(classes.map((item) => requestJson(`/lms/teacher/classes/${item.id}`).catch(() => null)))).filter(Boolean);
  const assignments = courses.flatMap((course) => course.assignments.map((item) => ({ ...item, className: course.name, classId: course.id })));
  const submissionGroups = await Promise.all(assignments.map(async (assignment) => {
    const submissions = await requestJson(`/lms/teacher/classes/${assignment.classId}/assignments/${assignment.id}/submissions`).catch(() => []);
    return submissions.map((item) => ({ ...item, assignmentTitle: assignment.title, className: assignment.className, assignmentId: assignment.id, classId: assignment.classId }));
  }));
  const submissions = submissionGroups.flat().sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  const toGrade = submissions.filter((item) => item.score == null);
  const materials = courses.flatMap((course) => course.materials.map((item) => ({ ...item, className: course.name })));
  return { classes, courses, assignments, submissions, toGrade, materials };
}

async function loadStudentDashboard() {
  const classes = await requestJson('/lms/student/classes');
  const courses = (await Promise.all(classes.map((item) => requestJson(`/lms/student/classes/${item.id}`).catch(() => null)))).filter(Boolean);
  const assignments = courses.flatMap((course) => course.assignments.map((item) => ({ ...item, className: course.name })));
  const materials = courses.flatMap((course) => course.materials.map((item) => ({ ...item, className: course.name })));
  const now = Date.now();
  const dueSoon = assignments.filter((item) => !item.submissionId && item.dueAt && new Date(item.dueAt).getTime() >= now).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt));
  const graded = assignments.filter((item) => item.isGraded).sort((a, b) => new Date(b.dueAt ?? 0) - new Date(a.dueAt ?? 0));
  return { classes, assignments, materials: materials.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), dueSoon, graded };
}

function AdmissionsDashboard({ data }) {
  const stats = [
    { label: 'Total pendaftar', value: data.stats?.total ?? 0, icon: '◎' },
    { label: 'Menunggu verifikasi', value: data.stats?.pending ?? 0, icon: '◷' },
    { label: 'Diterima / aktif LMS', value: data.stats?.accepted ?? 0, icon: '✓' },
    { label: 'Gelombang aktif', value: data.stats?.activePeriods ?? 0, icon: '▦' },
  ];
  const maxCount = Math.max(1, ...(data.programInterest ?? []).map((item) => item.count));
  return <>
    <DashboardStatCards items={stats} />
    <div className="dashboard-feature-grid">
      <Card className="dashboard-panel"><div className="dashboard-panel-heading"><div><p className="eyebrow">Pemetaan minat</p><h2>Peminat per Program Keahlian</h2></div><span className="badge badge-neutral">{data.programInterest?.length ?? 0} program</span></div>
        {data.programInterest?.length ? <div className="progress-list">{data.programInterest.map((item) => { const width = `${Math.max(item.count ? 6 : 0, Math.round((item.count / maxCount) * 100))}%`; return <div className="progress-item" key={item.programId}><div><strong>{item.programName}</strong><span>{item.count} pendaftar</span></div><div className="progress-track"><span style={{ width }} /></div></div>; })}</div> : <p className="dashboard-inline-empty">Data minat program akan terlihat setelah pendaftar memilih jurusan.</p>}
      </Card>
      <Card className="dashboard-panel dashboard-auto-info"><span className="dashboard-info-icon">✓</span><div><p className="eyebrow">Integrasi PPDB &amp; LMS</p><h2>Akun siswa otomatis</h2><p>Pendaftar berstatus <strong>Diterima</strong> otomatis memperoleh akses login Portal LMS Siswa. Password awal: <code>login123</code>. Pastikan satu kelas tujuan otomatis sudah ditandai untuk programnya.</p><a className="text-link" href="/dashboard/classes">Atur kelas tujuan PPDB →</a></div></Card>
    </div>
    <Card className="dashboard-panel dashboard-table-panel"><div className="dashboard-panel-heading"><div><p className="eyebrow">Perlu ditindaklanjuti</p><h2>Antrean Pendaftar Terbaru</h2></div><a className="text-link" href="/dashboard/admissions">Buka semua pendaftar →</a></div>
      {data.recentApplications?.length ? <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Pendaftar</th><th>Program</th><th>Tanggal</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{data.recentApplications.map((item) => <tr key={item.id}><td><strong>{item.fullName}</strong><small>{item.registrationNumber}</small></td><td>{item.programName || 'Belum dipilih'}</td><td>{formatDate(item.createdAt)}</td><td><span className="status-label" data-status={item.status}>{item.status}</span></td><td><a className="button button-secondary button-compact" href={`/dashboard/admissions?application=${encodeURIComponent(item.id)}`}>Verifikasi Sekarang</a></td></tr>)}</tbody></table></div> : <div className="dashboard-inline-empty">Belum ada antrean pendaftar. Data akan muncul saat calon siswa mengirim formulir.</div>}
    </Card>
  </>;
}

function WebsiteDashboard({ data }) {
  const publishedNews = (data.news ?? []).filter((item) => item.publishedAt);
  const publishedEvents = data.events ?? [];
  const latest = [...publishedNews.map((item) => ({ ...item, kind: 'Berita', date: item.publishedAt })), ...publishedEvents.map((item) => ({ ...item, kind: 'Agenda', date: item.startsAt }))].sort((a, b) => new Date(b.date ?? 0) - new Date(a.date ?? 0)).slice(0, 5);
  return <>
    <DashboardStatCards items={[{ label: 'Berita & agenda', value: publishedNews.length + publishedEvents.length, icon: '▤' }, { label: 'Program keahlian', value: data.programs?.length ?? 0, icon: '▦' }, { label: 'Foto galeri', value: data.galleries?.length ?? 0, icon: '▧' }, { label: 'Pengguna sistem', value: data.users?.length ?? 0, icon: '◎' }]} />
    <section className="dashboard-panel-block"><div className="dashboard-panel-heading"><div><p className="eyebrow">Akses cepat</p><h2>Quick Actions</h2></div></div><div className="quick-action-grid"><a href="/dashboard/content?resource=news"><span>＋</span><strong>Tambah Berita</strong><small>Tulis informasi sekolah</small></a><a href="/dashboard/gallery"><span>▧</span><strong>Upload Galeri</strong><small>Dokumentasikan kegiatan</small></a><a href="/dashboard/users"><span>＋</span><strong>Buat Akun Guru/Siswa</strong><small>Kelola akses pengguna</small></a><a href="/dashboard/content?resource=profiles"><span>✎</span><strong>Edit Profil</strong><small>Perbarui profil sekolah</small></a></div></section>
    <div className="dashboard-feature-grid">
      <Card className="dashboard-panel"><div className="dashboard-panel-heading"><div><p className="eyebrow">Publikasi terkini</p><h2>Berita &amp; Agenda</h2></div><a className="text-link" href="/dashboard/content?resource=news">Kelola →</a></div>{latest.length ? <ul className="dashboard-activity-list">{latest.map((item) => <li key={`${item.kind}-${item.id}`}><span className="activity-dot" /><div><span className="activity-meta">{item.kind} · {formatDate(item.date)}</span><strong>{item.title}</strong></div><a href={item.kind === 'Berita' ? `/berita/${item.slug}` : '/berita-agenda'} aria-label={`Buka ${item.title}`}>→</a></li>)}</ul> : <p className="dashboard-inline-empty">Belum ada berita atau agenda terbit. Gunakan tombol Tambah Berita untuk mulai publikasi.</p>}</Card>
      <Card className="dashboard-panel"><div className="dashboard-panel-heading"><div><p className="eyebrow">Dokumentasi terbaru</p><h2>Galeri kegiatan</h2></div><a className="text-link" href="/dashboard/gallery">Kelola →</a></div>{data.galleries?.length ? <div className="dashboard-gallery-list">{data.galleries.slice(0, 5).map((item) => <article key={item.id}>{item.imageUrl ? <img src={item.imageUrl} alt="" /> : <span className="dashboard-gallery-placeholder">▧</span>}<div><small>{item.category}</small><strong>{item.title}</strong></div></article>)}</div> : <p className="dashboard-inline-empty">Belum ada dokumentasi. Unggah foto kegiatan melalui Kelola Galeri.</p>}</Card>
    </div>
  </>;
}

function TeacherDashboard({ data }) {
  return <>
    <DashboardStatCards items={[{ label: 'Kelas diampu', value: data.classes?.length ?? 0, icon: '▦' }, { label: 'Materi terpublikasi', value: data.materials?.length ?? 0, icon: '▤' }, { label: 'Tugas aktif', value: data.assignments?.filter((item) => !item.dueAt || new Date(item.dueAt).getTime() >= Date.now()).length ?? 0, icon: '✓' }, { label: 'Pengumpulan perlu dinilai', value: data.toGrade?.length ?? 0, icon: '◷' }]} />
    <div className="dashboard-feature-grid">
      <Card className="dashboard-panel"><div className="dashboard-panel-heading"><div><p className="eyebrow">Antrean penilaian</p><h2>Pengumpulan Tugas Siswa Terbaru</h2></div><a className="text-link" href="/dashboard/classes">Buka LMS →</a></div>{data.submissions?.length ? <div className="dashboard-table-wrap"><table className="dashboard-table"><thead><tr><th>Siswa</th><th>Tugas / Kelas</th><th>Dikirim</th><th>Status</th><th>Aksi</th></tr></thead><tbody>{data.submissions.slice(0, 8).map((item) => <tr key={item.id}><td><strong>{item.studentName}</strong><small>{item.studentEmail}</small></td><td>{item.assignmentTitle}<small>{item.className}</small></td><td>{formatDate(item.submittedAt)}</td><td><span className="status-label" data-status={item.score == null ? 'needs_review' : 'graded'}>{item.score == null ? 'Perlu dinilai' : `Nilai ${item.score}`}</span></td><td><a className="button button-secondary button-compact" href="/dashboard/classes">Beri nilai</a></td></tr>)}</tbody></table></div> : <p className="dashboard-inline-empty">Belum ada pengumpulan tugas. Pengumpulan siswa akan muncul di daftar ini.</p>}</Card>
      <Card className="dashboard-panel"><div className="dashboard-panel-heading"><div><p className="eyebrow">Ruang kelas</p><h2>Kelas aktif</h2></div></div>{data.classes?.length ? <div className="dashboard-class-list">{data.classes.map((item) => <a key={item.id} href="/dashboard/classes"><span className="class-avatar">{item.name.slice(0, 1)}</span><span><strong>{item.name}</strong><small>{item.academicYear} · {item.subjects?.length ?? 0} mata pelajaran</small></span><b>→</b></a>)}</div> : <p className="dashboard-inline-empty">Belum ada kelas yang ditugaskan. Hubungi admin untuk mengatur penugasan kelas.</p>}<a className="button button-primary dashboard-wide-action" href="/dashboard/classes">＋ Upload materi</a></Card>
    </div>
  </>;
}

function StudentDashboard({ data }) {
  const due = data.dueSoon?.[0];
  return <>
    <DashboardStatCards items={[{ label: 'Kelas diikuti', value: data.classes?.length ?? 0, icon: '▦' }, { label: 'Materi tersedia', value: data.materials?.length ?? 0, icon: '▤' }, { label: 'Tugas belum dikumpulkan', value: data.assignments?.filter((item) => !item.submissionId && (!item.dueAt || new Date(item.dueAt).getTime() >= Date.now())).length ?? 0, icon: '◷' }, { label: 'Tugas sudah dinilai', value: data.graded?.length ?? 0, icon: '✓' }]} />
    <div className="dashboard-feature-grid student-dashboard-grid">
      <Card className="dashboard-panel deadline-panel"><p className="eyebrow">Deadline alert</p><h2>Tenggat Tugas Terdekat</h2>{due ? <><h3>{due.title}</h3><p>{due.className} · Tenggat {formatDateTimeDashboard(due.dueAt)}</p><a className="button button-primary" href="/dashboard/classes">Kerjakan tugas →</a></> : <p className="dashboard-inline-empty">Tidak ada tugas yang mendekati tenggat. Anda dapat menggunakan waktu ini untuk meninjau materi.</p>}</Card>
      <Card className="dashboard-panel"><div className="dashboard-panel-heading"><div><p className="eyebrow">Bahan belajar</p><h2>Materi Terbaru dari Guru</h2></div><a className="text-link" href="/dashboard/classes">Buka kelas →</a></div>{data.materials?.length ? <ul className="dashboard-activity-list">{data.materials.slice(0, 5).map((item) => <li key={item.id}><span className="material-icon">▤</span><div><span className="activity-meta">{item.className} · {formatDate(item.createdAt)}</span><strong>{item.title}</strong></div><a href="/dashboard/classes">→</a></li>)}</ul> : <p className="dashboard-inline-empty">Materi dari guru akan tampil di sini setelah tersedia.</p>}</Card>
      <Card className="dashboard-panel"><div className="dashboard-panel-heading"><div><p className="eyebrow">Hasil belajar</p><h2>Riwayat Nilai Terakhir</h2></div></div>{data.graded?.length ? <div className="grade-history-list">{data.graded.slice(0, 5).map((item) => <article key={item.id}><div><strong>{item.title}</strong><small>{item.className}</small></div><span className="grade-score">{item.score ?? '—'}</span></article>)}</div> : <p className="dashboard-inline-empty">Nilai yang telah dipublikasikan guru akan tercatat di bagian ini.</p>}</Card>
    </div>
  </>;
}

function formatDateTimeDashboard(value) {
  if (!value) return 'Belum ditentukan';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value));
}
