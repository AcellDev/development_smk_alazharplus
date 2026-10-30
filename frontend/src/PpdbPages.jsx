import { useEffect, useState } from 'react';
import { Alert, Button, Card, EmptyState, Input, Spinner, TextArea } from './components/ui.jsx';
import { DashboardLayout, PublicLayout } from './layouts.jsx';
import { API_URL, requestJson } from './content-api.js';

function usePpdbData(path) {
  const [state, setState] = useState({ loading: true, data: null, error: '' });
  useEffect(() => {
    let mounted = true;
    requestJson(path).then((data) => mounted && setState({ loading: false, data, error: '' }))
      .catch((error) => mounted && setState({ loading: false, data: null, error: error.message }));
    return () => { mounted = false; };
  }, [path]);
  return state;
}

function PpdbShell({ children }) {
  return <PublicLayout>{children}</PublicLayout>;
}

function PageLoading({ text = 'Memuat…' }) { return <div className="state-wrap"><Spinner /> {text}</div>; }
function formatDateTime(value) {
  if (!value) return 'Belum ditentukan';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value));
}

export function PpdbInfoPage() {
  const state = usePpdbData('/ppdb/configuration');
  return <PpdbShell><header className="content-page-intro"><p className="eyebrow">Penerimaan peserta didik baru</p><h1>Informasi PPDB</h1><p className="muted">Periode, tahapan, persyaratan, dan pengumuman resmi dari sekolah.</p></header>
    {state.loading ? <PageLoading /> : state.error ? <Alert tone="danger" role="alert">{state.error}</Alert> : <>
      {state.data.period ? <Card className="period-card"><p className="eyebrow">Periode PPDB</p><h2>{state.data.period.name}</h2><p>{formatDateTime(state.data.period.startsAt)} — {formatDateTime(state.data.period.endsAt)}</p>{state.data.period.isRegistrationOpen ? <a className="button button-primary" href="/ppdb/daftar">Mulai pendaftaran</a> : <Alert tone="info">Pendaftaran belum dibuka. Silakan periksa kembali sesuai informasi jadwal sekolah.</Alert>}</Card> : <Alert tone="info">Informasi periode PPDB belum diterbitkan sekolah.</Alert>}
      <section className="public-section"><h2>Tahapan dan jadwal</h2>{state.data.schedule.length ? <div className="ppdb-list">{state.data.schedule.map((item) => <article className="ppdb-list-item" key={item.id}><h3>{item.title}</h3><p>{item.description || 'Keterangan belum tersedia.'}</p><p className="muted">{formatDateTime(item.startsAt)}{item.endsAt ? ` — ${formatDateTime(item.endsAt)}` : ''}</p></article>)}</div> : <EmptyState title="Jadwal belum diterbitkan" description="Tahapan dan tanggal akan ditampilkan setelah dikonfirmasi sekolah." />}</section>
      <section className="public-section"><h2>Persyaratan dokumen</h2>{state.data.requirements.length ? <ul className="requirements-list">{state.data.requirements.map((item) => <li key={item.id}><span>{item.name}{item.isRequired ? ' — Wajib' : ' — Opsional'}</span><small>{item.description || 'Keterangan belum tersedia.'} Format: {item.allowedMimeTypes.map((type) => type.replace('application/', '').replace('image/', '').toUpperCase()).join(', ')}. Maksimal {(Number(item.maxBytes) / (1024 * 1024)).toFixed(1)} MB.</small></li>)}</ul> : <EmptyState title="Persyaratan belum diterbitkan" description="Persyaratan akan muncul setelah ditetapkan panitia." />}</section>
      <section className="public-section"><h2>Pengumuman</h2>{state.data.announcements.length ? <div className="ppdb-list">{state.data.announcements.map((item) => <article className="ppdb-list-item" key={item.id}><h3>{item.title}</h3><p className="formatted-copy">{item.body}</p><small className="muted">{formatDateTime(item.publishedAt)}</small></article>)}</div> : <EmptyState title="Belum ada pengumuman" description="Pengumuman resmi akan tampil di sini." />}</section>
    </>}
  </PpdbShell>;
}

const blankApplication = { fullName: '', email: '', password: '', phone: '', address: '', guardianName: '', guardianRelationship: '', guardianPhone: '', previousInstitution: '', previousGraduationYear: '' };

export function PpdbRegistrationPage() {
  const config = usePpdbData('/ppdb/configuration');
  const [form, setForm] = useState(blankApplication);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState(null);

  async function submit(event) {
    event.preventDefault(); setSaving(true); setError('');
    try { setCreated(await requestJson('/ppdb/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })); }
    catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }

  return <PpdbShell><header className="content-page-intro"><p className="eyebrow">Pendaftaran online</p><h1>Formulir PPDB</h1><p className="muted">Isi data yang diminta. Informasi akun digunakan untuk kembali melihat status pendaftaran.</p></header>
    {config.loading ? <PageLoading /> : config.error ? <Alert tone="danger">{config.error}</Alert> : !config.data.period ? <Alert tone="info">Pendaftaran belum dibuka untuk saat ini. <a href="/ppdb">Lihat informasi PPDB</a>.</Alert> : created ? <Card className="registration-success"><p className="eyebrow">Pendaftaran tersimpan</p><h2>Nomor pendaftaran: {created.application.registrationNumber}</h2><p>Status awal: <strong>Draft</strong>. Unggah dokumen persyaratan dan kirim pendaftaran dari halaman status.</p><a className="button button-primary" href="/ppdb/status">Lanjutkan pendaftaran</a></Card> : <>
      {error && <Alert tone="danger" role="alert">{error}</Alert>}
      <form className="application-form surface-card" onSubmit={submit}>
        <fieldset><legend>Data calon siswa</legend><div className="form-grid">
          <Input label="Nama lengkap" required maxLength={160} autoComplete="name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Input label="Email akun" type="email" required maxLength={254} autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Password akun" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <Input label="Nomor telepon" type="tel" maxLength={50} autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <TextArea label="Alamat" rows={3} maxLength={1000} autoComplete="street-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div></fieldset>
        <fieldset><legend>Orang tua/wali <span className="muted">(opsional)</span></legend><div className="form-grid">
          <Input label="Nama orang tua/wali" maxLength={160} value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
          <Input label="Hubungan" maxLength={60} value={form.guardianRelationship} onChange={(e) => setForm({ ...form, guardianRelationship: e.target.value })} />
          <Input label="Telepon orang tua/wali" type="tel" maxLength={50} value={form.guardianPhone} onChange={(e) => setForm({ ...form, guardianPhone: e.target.value })} />
        </div></fieldset>
        <fieldset><legend>Pendidikan sebelumnya <span className="muted">(opsional)</span></legend><div className="form-grid">
          <Input label="Nama sekolah asal" maxLength={200} value={form.previousInstitution} onChange={(e) => setForm({ ...form, previousInstitution: e.target.value })} />
          <Input label="Tahun lulus" type="number" min="1900" max={new Date().getFullYear() + 1} value={form.previousGraduationYear} onChange={(e) => setForm({ ...form, previousGraduationYear: e.target.value })} />
        </div></fieldset>
        <p className="form-note">Dengan membuat akun, Anda dapat mengunggah dokumen, mengirim pendaftaran, dan memantau status. Jangan gunakan email atau password milik orang lain.</p>
        <Button type="submit" disabled={saving}>{saving ? <><Spinner /> Menyimpan…</> : 'Buat akun dan simpan draf'}</Button>
      </form>
    </>}
  </PpdbShell>;
}

const statusCopy = {
  Draft: 'Lengkapi dan kirim pendaftaran setelah persyaratan dokumen siap.',
  Dikirim: 'Pendaftaran telah dikirim dan menunggu pemeriksaan panitia.',
  'Perlu Perbaikan': 'Periksa catatan panitia, perbarui data atau dokumen yang diminta, lalu kirim kembali.',
  Terverifikasi: 'Data dan dokumen telah diverifikasi oleh panitia.',
  Lulus: 'Hasil seleksi: lulus.',
  'Tidak Lulus': 'Hasil seleksi: tidak lulus.',
};

export function PpdbStatusPage() {
  const [state, setState] = useState('loading');
  const [application, setApplication] = useState(null);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [details, setDetails] = useState(blankApplication);
  const [savingDetails, setSavingDetails] = useState(false);

  async function load() {
    setState('loading'); setError('');
    try {
      const session = await requestJson('/auth/session');
      if (session.user.role !== 'applicant') throw new Error('Masuk menggunakan akun calon siswa untuk melihat status pendaftaran.');
      const item = await requestJson('/ppdb/applications/mine');
      const guardian = item.guardians[0] ?? {};
      const education = item.previousEducation ?? {};
      setUser(session.user); setApplication(item);
      setDetails({ fullName: item.fullName, email: item.email, phone: item.phone ?? '', address: item.address ?? '', guardianName: guardian.fullName ?? '', guardianRelationship: guardian.relationship ?? '', guardianPhone: guardian.phone ?? '', previousInstitution: education.institutionName ?? '', previousGraduationYear: education.graduationYear ?? '' });
      setState('ready');
    } catch (requestError) { setError(requestError.message); setState('denied'); }
  }
  useEffect(() => { load(); }, []);

  async function upload(requirementId, file) {
    if (!file) return;
    setUploading(true); setError('');
    const data = new FormData(); data.set('requirementId', requirementId); data.set('file', file);
    try { await requestJson('/ppdb/applications/mine/documents', { method: 'POST', body: data }); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setUploading(false); }
  }

  async function submitApplication() {
    if (!window.confirm('Kirim pendaftaran untuk diperiksa panitia?')) return;
    setSubmitting(true); setError('');
    try { await requestJson('/ppdb/applications/mine/submit', { method: 'POST' }); await load(); }
    catch (requestError) { setError(requestError.message); }
    finally { setSubmitting(false); }
  }

  async function saveDetails(event) {
    event.preventDefault(); setSavingDetails(true); setError('');
    try {
      const { email: _email, ...payload } = details;
      await requestJson('/ppdb/applications/mine', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      await load();
    } catch (requestError) { setError(requestError.message); }
    finally { setSavingDetails(false); }
  }

  async function logout() {
    await requestJson('/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.assign('/');
  }

  if (state === 'loading') return <PpdbShell><PageLoading text="Memuat status pendaftaran…" /></PpdbShell>;
  if (state === 'denied') return <PpdbShell><Alert tone="warning">{error} <a href="/login">Masuk</a>.</Alert></PpdbShell>;
  const editable = ['Draft', 'Perlu Perbaikan'].includes(application.status);
  return <PpdbShell><header className="content-page-intro status-page-heading"><div><p className="eyebrow">Area calon siswa</p><h1>Status pendaftaran</h1><p className="muted">Akun: {user.email}</p></div><Button variant="secondary" onClick={logout}>Keluar</Button></header>
    {error && <Alert tone="danger" role="alert">{error}</Alert>}
    <Card className="application-summary"><div><p className="eyebrow">Nomor pendaftaran</p><h2>{application.registrationNumber}</h2></div><div><p className="eyebrow">Status</p><span className="status-label" data-status={application.status}>{application.status}</span></div><p>{statusCopy[application.status]}</p>{application.periodName && <small className="muted">Periode: {application.periodName}</small>}<Button className="print-receipt" variant="secondary" onClick={() => window.print()}>Cetak bukti pendaftaran</Button></Card>
    {application.status === 'Perlu Perbaikan' && application.history.filter((item) => item.toStatus === 'Perlu Perbaikan' && item.note).slice(-1).map((item) => <Alert key={item.changedAt} tone="warning"><strong>Catatan panitia:</strong> {item.note}</Alert>)}
    {editable && <section className="public-section"><h2>Data pendaftaran</h2><form className="surface-card form-stack" onSubmit={saveDetails}><div className="form-grid">
      <Input label="Nama lengkap" required maxLength={160} value={details.fullName} onChange={(e) => setDetails({ ...details, fullName: e.target.value })} />
      <Input label="Email akun" type="email" disabled value={details.email} onChange={() => {}} />
      <Input label="Nomor telepon" type="tel" maxLength={50} value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} />
      <TextArea label="Alamat" rows={3} maxLength={1000} value={details.address} onChange={(e) => setDetails({ ...details, address: e.target.value })} />
      <Input label="Nama orang tua/wali" maxLength={160} value={details.guardianName} onChange={(e) => setDetails({ ...details, guardianName: e.target.value })} />
      <Input label="Hubungan" maxLength={60} value={details.guardianRelationship} onChange={(e) => setDetails({ ...details, guardianRelationship: e.target.value })} />
      <Input label="Telepon orang tua/wali" maxLength={50} value={details.guardianPhone} onChange={(e) => setDetails({ ...details, guardianPhone: e.target.value })} />
      <Input label="Sekolah asal" maxLength={200} value={details.previousInstitution} onChange={(e) => setDetails({ ...details, previousInstitution: e.target.value })} />
      <Input label="Tahun lulus" type="number" min="1900" max={new Date().getFullYear() + 1} value={details.previousGraduationYear} onChange={(e) => setDetails({ ...details, previousGraduationYear: e.target.value })} />
    </div><Button type="submit" variant="secondary" disabled={savingDetails}>{savingDetails ? 'Menyimpan…' : 'Simpan data'}</Button></form></section>}
    <section className="public-section"><h2>Dokumen persyaratan</h2>{application.requirements.length ? <div className="ppdb-list">{application.requirements.map((requirement) => {
      const document = application.documents.find((item) => item.requirementId === requirement.id);
      return <article className="ppdb-list-item document-row" key={requirement.id}><div><h3>{requirement.name} {requirement.isRequired && <span className="required-label">Wajib</span>}</h3><p>{requirement.description || 'Persyaratan dokumen'}</p>{document ? <p className="document-meta"><button className="text-link" type="button" onClick={() => downloadDocument(document.id, document.originalName).catch((e) => setError(e.message))}>{document.originalName}</button> · diunggah {formatDateTime(document.uploadedAt)}</p> : <p className="muted">Belum ada berkas.</p>}</div>
        {editable && <label className="button button-secondary upload-control">{uploading ? 'Mengunggah…' : document ? 'Ganti file' : 'Unggah file'}<input type="file" accept={requirement.allowedMimeTypes.join(',')} disabled={uploading} onChange={(e) => upload(requirement.id, e.target.files?.[0])} /></label>}
      </article>;
    })}</div> : <EmptyState title="Belum ada persyaratan dokumen" description="Panitia belum menetapkan persyaratan untuk periode ini." />}</section>
    {editable && <div className="submit-application"><p className="muted">Pastikan data dan dokumen sudah benar sebelum dikirim.</p><Button disabled={submitting || uploading} onClick={submitApplication}>{submitting ? 'Mengirim…' : application.status === 'Draft' ? 'Kirim pendaftaran' : 'Kirim ulang untuk diperiksa'}</Button></div>}
    <section className="public-section"><h2>Riwayat status</h2>{application.history.length ? <ol className="status-history">{application.history.map((item, index) => <li key={`${item.changedAt}-${index}`}><strong>{item.toStatus}</strong><span>{formatDateTime(item.changedAt)}</span>{item.note && <p>{item.note}</p>}</li>)}</ol> : <EmptyState title="Belum ada riwayat" description="Perubahan status akan tercatat di sini." />}</section>
  </PpdbShell>;
}

async function downloadDocument(id, filename) {
  const response = await fetch(`${API_URL}/ppdb/documents/${id}`, { credentials: 'include' });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error?.message ?? 'Dokumen tidak dapat diunduh.');
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
}

const ppdbResources = { periods: 'Periode', requirements: 'Persyaratan', schedule: 'Tahapan/jadwal', announcements: 'Pengumuman' };
const blankResourceDraft = {
  periods: { name: '', startsAt: '', endsAt: '', isOpen: false, isPublished: false },
  requirements: { periodId: '', name: '', description: '', isRequired: false, allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'], maxBytes: 5242880, displayOrder: 0 },
  schedule: { periodId: '', title: '', description: '', startsAt: '', endsAt: '', displayOrder: 0 },
  announcements: { periodId: '', title: '', body: '', isPublished: false },
};
const fileTypeOptions = [['application/pdf', 'PDF'], ['image/jpeg', 'JPEG'], ['image/png', 'PNG'], ['image/webp', 'WebP']];

export function PpdbAdminPage() {
  const [user, setUser] = useState(null);
  const [state, setState] = useState('loading');
  useEffect(() => {
    requestJson('/auth/session').then(({ user: current }) => {
      if (current.role !== 'admin_ppdb') throw new Error('Halaman ini hanya tersedia untuk panitia PPDB.');
      setUser(current); setState('ready');
    }).catch(() => setState('denied'));
  }, []);
  if (state === 'loading') return <main className="page-loading"><Spinner /> Memeriksa akses…</main>;
  if (state === 'denied') return <main className="page-loading"><Alert tone="warning">Akses panitia PPDB diperlukan. <a href="/login">Masuk</a>.</Alert></main>;
  return <PpdbAdmin user={user} />;
}

function PpdbAdmin({ user }) {
  const [tab, setTab] = useState('applications');
  const [periods, setPeriods] = useState([]);
  const [resourceItems, setResourceItems] = useState([]);
  const [periodFilter, setPeriodFilter] = useState('');
  const [draft, setDraft] = useState({ ...blankResourceDraft.periods });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [applications, setApplications] = useState([]);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [decision, setDecision] = useState('');
  const [decisionNote, setDecisionNote] = useState('');

  async function loadPeriods() {
    const data = await requestJson('/ppdb/admin/periods'); setPeriods(data);
    setPeriodFilter((current) => current || data[0]?.id || '');
  }
  async function loadResource() {
    if (tab === 'applications') return;
    setLoading(true); setError('');
    try {
      if (tab === 'periods') { await loadPeriods(); setResourceItems(await requestJson('/ppdb/admin/periods')); }
      else {
        const query = ['requirements', 'schedule'].includes(tab) && periodFilter ? `?periodId=${encodeURIComponent(periodFilter)}` : '';
        setResourceItems(await requestJson(`/ppdb/admin/${tab}${query}`));
      }
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadPeriods().catch((e) => setError(e.message)); }, []);
  useEffect(() => { loadResource(); }, [tab, periodFilter]);

  async function loadApplications() {
    setLoading(true); setError('');
    try {
      const query = new URLSearchParams();
      if (statusFilter) query.set('status', statusFilter);
      if (search.trim()) query.set('search', search.trim());
      if (periodFilter) query.set('periodId', periodFilter);
      const list = await requestJson(`/ppdb/admin/applications?${query}`); setApplications(list);
      if (selectedApplication && !list.some((item) => item.id === selectedApplication.id)) setSelectedApplication(null);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (tab === 'applications') loadApplications(); }, [tab, statusFilter, periodFilter]);

  function newResource() { setEditingId(null); setDraft({ ...blankResourceDraft[tab] }); setError(''); setNotice(''); }
  function editResource(item) {
    const next = { ...blankResourceDraft[tab], ...item };
    for (const field of ['startsAt', 'endsAt']) if (next[field]) next[field] = toLocalDateTime(next[field]);
    setDraft(next); setEditingId(item.id); setError(''); setNotice('');
  }
  function switchTab(nextTab) { setTab(nextTab); setEditingId(null); setDraft({ ...blankResourceDraft[nextTab] }); setError(''); setNotice(''); }

  async function saveResource(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    const payload = { ...draft };
    for (const field of ['startsAt', 'endsAt']) if (payload[field]) payload[field] = new Date(payload[field]).toISOString(); else payload[field] = null;
    if (tab === 'periods') { delete payload.periodId; }
    try {
      const path = tab === 'periods' ? '/ppdb/admin/periods' : `/ppdb/admin/${tab}${editingId ? `/${editingId}` : ''}`;
      await requestJson(path, { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      setNotice(`${ppdbResources[tab]} berhasil disimpan.`); newResource(); await loadPeriods(); await loadResource();
    } catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }

  async function deleteResource(item) {
    if (!window.confirm(`Hapus “${item.name ?? item.title}”?`)) return;
    try {
      await requestJson(`/ppdb/admin/${tab}/${item.id}`, { method: 'DELETE' }); setNotice('Data berhasil dihapus.'); newResource(); await loadPeriods(); await loadResource();
    } catch (deleteError) { setError(deleteError.message); }
  }

  async function showApplication(item) {
    setSelectedApplication(null); setError('');
    try { setSelectedApplication(await requestJson(`/ppdb/admin/applications/${item.id}`)); }
    catch (requestError) { setError(requestError.message); }
  }

  async function updateStatus(event) {
    event.preventDefault(); if (!selectedApplication || !decision) return;
    if (!window.confirm(`Ubah status menjadi “${decision}”?`)) return;
    setSaving(true); setError(''); setNotice('');
    try {
      await requestJson(`/ppdb/admin/applications/${selectedApplication.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: decision, note: decisionNote }) });
      setNotice('Status pendaftaran diperbarui dan tercatat dalam riwayat.'); setDecision(''); setDecisionNote('');
      await showApplication(selectedApplication); await loadApplications();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }

  async function logout() { await requestJson('/auth/logout', { method: 'POST' }).catch(() => {}); window.location.assign('/'); }

  return <DashboardLayout user={user} onLogout={logout} loggingOut={false}><div className="page-heading"><div><p className="eyebrow">Penerimaan peserta didik baru</p><h1>Dashboard panitia</h1></div></div>
    {error && <Alert tone="danger" role="alert">{error}</Alert>}{notice && <Alert tone="info" role="status">{notice}</Alert>}
    <div className="ppdb-admin-tabs" role="tablist" aria-label="Menu PPDB">{[['applications', 'Pendaftar'], ...Object.entries(ppdbResources)].map(([key, label]) => <button type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'selected' : ''} key={key} onClick={() => switchTab(key)}>{label}</button>)}</div>
    {tab === 'applications' ? <section className="ppdb-admin-workspace">
      <div className="surface-card application-list-panel"><h2>Daftar pendaftar</h2><div className="filter-grid"><Input label="Cari nama, email, atau nomor" value={search} onChange={(e) => setSearch(e.target.value)} /><div className="field"><label htmlFor="app-status-filter">Status</label><select id="app-status-filter" className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">Semua status</option>{allStatuses.map((value) => <option key={value}>{value}</option>)}</select></div><div className="field"><label htmlFor="app-period-filter">Periode</label><select id="app-period-filter" className="input" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}><option value="">Semua periode</option>{periods.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></div><Button variant="secondary" onClick={loadApplications}>Cari</Button></div>
        <p className="muted result-limit">Menampilkan paling banyak 100 hasil.</p>
        {loading ? <PageLoading /> : applications.length ? <div className="application-table-wrap"><table className="application-table"><thead><tr><th>No. pendaftaran</th><th>Nama</th><th>Status</th></tr></thead><tbody>{applications.map((item) => <tr key={item.id} className={selectedApplication?.id === item.id ? 'selected-row' : ''}><td><button className="text-link" onClick={() => showApplication(item)}>{item.registrationNumber}</button></td><td>{item.fullName}<small>{item.email}</small></td><td><span className="status-label" data-status={item.status}>{item.status}</span></td></tr>)}</tbody></table></div> : <EmptyState title="Belum ada pendaftar" description="Pendaftar yang dikirim akan tampil di sini." />}
      </div>
      <div className="surface-card application-detail-panel">{selectedApplication ? <ApplicationReview item={selectedApplication} decision={decision} setDecision={setDecision} note={decisionNote} setNote={setDecisionNote} onUpdate={updateStatus} saving={saving} /> : <EmptyState title="Pilih pendaftar" description="Pilih nomor pendaftaran untuk memeriksa data dan dokumen." />}</div>
    </section> : <section className="content-admin-grid ppdb-config-grid">
      <div className="surface-card admin-list"><div className="field"><label htmlFor="config-period-filter">Periode</label><select id="config-period-filter" className="input" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}><option value="">Pilih periode</option>{periods.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></div><Button variant="secondary" className="new-config-button" onClick={newResource}>Tambah {ppdbResources[tab].toLowerCase()}</Button>
        {loading ? <PageLoading /> : resourceItems.length ? <div className="admin-item-list">{resourceItems.map((item) => <div className="admin-item" key={item.id}><button type="button" className="admin-item-title" onClick={() => editResource(item)}>{item.name ?? item.title}</button><span className="admin-item-status">{tab === 'periods' ? [item.isPublished ? 'Tampil publik' : 'Disembunyikan', item.isOpen ? 'Pendaftaran dibuka' : 'Pendaftaran ditutup'].join(' · ') : item.isOpen ? 'Dibuka' : item.isPublished ? 'Terbit' : ''}</span><Button variant="danger" onClick={() => deleteResource(item)}>Hapus</Button></div>)}</div> : <p className="muted list-feedback">Belum ada data konfigurasi.</p>}
      </div>
      <PpdbConfigEditor tab={tab} periods={periods} draft={draft} setDraft={setDraft} onSubmit={saveResource} saving={saving} editing={Boolean(editingId)} onCancel={newResource} />
    </section>}
  </DashboardLayout>;
}

const allStatuses = ['Draft', 'Dikirim', 'Perlu Perbaikan', 'Terverifikasi', 'Lulus', 'Tidak Lulus'];

function PpdbConfigEditor({ tab, periods, draft, setDraft, onSubmit, saving, editing, onCancel }) {
  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  return <section className="surface-card editor-card"><h2>{editing ? 'Ubah' : 'Tambah'} {ppdbResources[tab].toLowerCase()}</h2>
    <form className="form-stack" onSubmit={onSubmit}>
      {tab !== 'periods' && <div className="field"><label htmlFor="config-period">Periode PPDB{tab === 'announcements' ? ' (opsional)' : ''}</label><select id="config-period" className="input" required={tab !== 'announcements'} value={draft.periodId ?? ''} onChange={(e) => update('periodId', e.target.value)}><option value="">{tab === 'announcements' ? 'Pengumuman umum' : 'Pilih periode'}</option>{periods.map((period) => <option value={period.id} key={period.id}>{period.name}</option>)}</select></div>}
      {tab === 'periods' && <><Input label="Nama periode" required maxLength={120} value={draft.name} onChange={(e) => update('name', e.target.value)} /><Input label="Mulai" type="datetime-local" value={draft.startsAt} onChange={(e) => update('startsAt', e.target.value)} /><Input label="Selesai" type="datetime-local" value={draft.endsAt} onChange={(e) => update('endsAt', e.target.value)} /><label className="check-field"><input type="checkbox" checked={draft.isPublished} onChange={(e) => update('isPublished', e.target.checked)} /> Tampilkan informasi periode ke publik</label><label className="check-field"><input type="checkbox" checked={draft.isOpen} onChange={(e) => update('isOpen', e.target.checked)} /> Buka pendaftaran dalam rentang tanggal</label></>}
      {tab === 'requirements' && <><Input label="Nama persyaratan" required maxLength={160} value={draft.name} onChange={(e) => update('name', e.target.value)} /><TextArea label="Keterangan" rows={3} maxLength={1000} value={draft.description ?? ''} onChange={(e) => update('description', e.target.value)} /><label className="check-field"><input type="checkbox" checked={Boolean(draft.isRequired)} onChange={(e) => update('isRequired', e.target.checked)} /> Wajib diunggah</label><fieldset className="mime-options"><legend>Format yang diterima</legend>{fileTypeOptions.map(([mime, label]) => <label key={mime}><input type="checkbox" checked={draft.allowedMimeTypes?.includes(mime) ?? false} onChange={(e) => update('allowedMimeTypes', e.target.checked ? [...draft.allowedMimeTypes, mime] : draft.allowedMimeTypes.filter((value) => value !== mime))} /> {label}</label>)}</fieldset><Input label="Batas ukuran (byte)" type="number" min="1" max={10485760} required value={draft.maxBytes} onChange={(e) => update('maxBytes', e.target.value)} /><Input label="Urutan tampil" type="number" min="0" max="10000" value={draft.displayOrder} onChange={(e) => update('displayOrder', e.target.value)} /></>}
      {tab === 'schedule' && <><Input label="Nama tahapan" required maxLength={160} value={draft.title} onChange={(e) => update('title', e.target.value)} /><TextArea label="Keterangan" rows={3} maxLength={1000} value={draft.description ?? ''} onChange={(e) => update('description', e.target.value)} /><Input label="Mulai" type="datetime-local" value={draft.startsAt} onChange={(e) => update('startsAt', e.target.value)} /><Input label="Selesai" type="datetime-local" value={draft.endsAt} onChange={(e) => update('endsAt', e.target.value)} /><Input label="Urutan tampil" type="number" min="0" max="10000" value={draft.displayOrder} onChange={(e) => update('displayOrder', e.target.value)} /></>}
      {tab === 'announcements' && <><Input label="Judul pengumuman" required maxLength={160} value={draft.title} onChange={(e) => update('title', e.target.value)} /><TextArea label="Isi pengumuman" required rows={6} maxLength={10000} value={draft.body} onChange={(e) => update('body', e.target.value)} /><label className="check-field"><input type="checkbox" checked={Boolean(draft.isPublished)} onChange={(e) => update('isPublished', e.target.checked)} /> Terbitkan pengumuman</label></>}
      <div className="button-row"><Button type="submit" disabled={saving || (tab !== 'periods' && !periods.length)}>{saving ? 'Menyimpan…' : 'Simpan'}</Button><Button type="button" variant="secondary" onClick={onCancel}>Batal</Button></div>
    </form>
  </section>;
}

function ApplicationReview({ item, decision, setDecision, note, setNote, onUpdate, saving }) {
  const allowed = item.status === 'Dikirim' ? ['Perlu Perbaikan', 'Terverifikasi'] : item.status === 'Terverifikasi' ? ['Lulus', 'Tidak Lulus'] : [];
  const guardian = item.guardians[0];
  return <div className="review-details"><p className="eyebrow">Detail pendaftar</p><h2>{item.registrationNumber}</h2><dl className="review-data">
    <div><dt>Nama</dt><dd>{item.fullName}</dd></div><div><dt>Email</dt><dd>{item.email}</dd></div><div><dt>Telepon</dt><dd>{item.phone || 'Belum diisi'}</dd></div><div><dt>Alamat</dt><dd>{item.address || 'Belum diisi'}</dd></div><div><dt>Periode</dt><dd>{item.periodName}</dd></div><div><dt>Status</dt><dd><strong>{item.status}</strong></dd></div>
    <div><dt>Orang tua/wali</dt><dd>{guardian ? `${guardian.fullName}${guardian.relationship ? ` (${guardian.relationship})` : ''} · ${guardian.phone || 'telepon belum diisi'}` : 'Belum diisi'}</dd></div><div><dt>Sekolah asal</dt><dd>{item.previousEducation ? `${item.previousEducation.institutionName}${item.previousEducation.graduationYear ? ` · ${item.previousEducation.graduationYear}` : ''}` : 'Belum diisi'}</dd></div>
  </dl>
  <section><h3>Dokumen</h3>{item.documents.length ? <ul className="review-documents">{item.documents.map((doc) => <li key={doc.id}><span>{doc.requirementName || 'Dokumen'}: {doc.originalName}</span><button className="text-link" type="button" onClick={() => downloadDocument(doc.id, doc.originalName).catch(() => {})}>Unduh</button></li>)}</ul> : <p className="muted">Belum ada dokumen.</p>}</section>
  {allowed.length > 0 && <form className="form-stack review-action" onSubmit={onUpdate}><h3>Perbarui status</h3><div className="field"><label htmlFor="review-status">Status tujuan</label><select id="review-status" className="input" required value={decision} onChange={(e) => setDecision(e.target.value)}><option value="">Pilih status</option>{allowed.map((value) => <option key={value}>{value}</option>)}</select></div><TextArea label={decision === 'Perlu Perbaikan' ? 'Catatan perbaikan (wajib)' : 'Catatan (opsional)'} required={decision === 'Perlu Perbaikan'} rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} /><Button type="submit" disabled={saving || !decision}>{saving ? 'Menyimpan…' : 'Simpan status'}</Button></form>}
  <section><h3>Riwayat perubahan</h3><ol className="status-history">{item.history.map((entry, index) => <li key={`${entry.changedAt}-${index}`}><strong>{entry.toStatus}</strong><span>{formatDateTime(entry.changedAt)}{entry.changedBy ? ` · ${entry.changedBy}` : ''}</span>{entry.note && <p>{entry.note}</p>}</li>)}</ol></section>
  </div>;
}

function toLocalDateTime(value) {
  if (!value) return '';
  const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
