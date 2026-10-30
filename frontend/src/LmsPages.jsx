import { useEffect, useState } from 'react';
import { Alert, Button, Card, EmptyState, Input, Spinner, TextArea } from './components/ui.jsx';
import { DashboardLayout } from './layouts.jsx';
import { API_URL, requestJson } from './content-api.js';

export function LmsPage() {
  const [state, setState] = useState('loading');
  const [user, setUser] = useState(null);
  useEffect(() => {
    requestJson('/auth/session').then(({ user: currentUser }) => {
      if (!['admin_website', 'teacher', 'student'].includes(currentUser.role)) throw new Error('Akses LMS tidak tersedia untuk role akun ini.');
      setUser(currentUser); setState('ready');
    }).catch(() => setState('denied'));
  }, []);
  if (state === 'loading') return <main className="page-loading"><Spinner /> Memeriksa akses…</main>;
  if (state === 'denied') return <main className="page-loading"><Alert tone="warning">Masuk menggunakan akun admin sekolah, guru, atau siswa. <a href="/login">Masuk</a>.</Alert></main>;
  if (user.role === 'admin_website') return <LmsSetup user={user} />;
  if (user.role === 'teacher') return <TeacherWorkspace user={user} />;
  return <StudentWorkspace user={user} />;
}

function LmsSetup({ user }) {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [classForm, setClassForm] = useState({ name: '', academicYear: '', description: '' });
  const [subjectName, setSubjectName] = useState('');
  const [classSubjectId, setClassSubjectId] = useState('');
  const [memberRole, setMemberRole] = useState('teacher');
  const [memberId, setMemberId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    const [classItems, subjectItems, teacherItems, studentItems] = await Promise.all([
      requestJson('/lms/admin/classes'), requestJson('/lms/admin/subjects'),
      requestJson('/lms/admin/users?role=teacher'), requestJson('/lms/admin/users?role=student'),
    ]);
    setClasses(classItems); setSubjects(subjectItems); setTeachers(teacherItems); setStudents(studentItems);
    setSelectedId((current) => current || classItems[0]?.id || '');
    setClassSubjectId((current) => current || subjectItems[0]?.id || '');
    setMemberId((current) => current || teacherItems[0]?.id || studentItems[0]?.id || '');
  }
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);
  const selected = classes.find((item) => item.id === selectedId);

  async function createClass(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const created = await requestJson('/lms/admin/classes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(classForm) });
      setClassForm({ name: '', academicYear: '', description: '' }); setSelectedId(created.id); setNotice('Kelas berhasil dibuat.'); await load();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  async function addSubject(event) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const item = await requestJson('/lms/admin/subjects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: subjectName }) });
      setSubjectName(''); setClassSubjectId(item.id); setNotice('Mata pelajaran ditambahkan.'); await load();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  async function linkSubject(event) {
    event.preventDefault(); if (!selected || !classSubjectId) return;
    setSaving(true); setError('');
    try { await requestJson(`/lms/admin/classes/${selected.id}/subjects`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subjectId: classSubjectId }) }); setNotice('Mata pelajaran terhubung ke kelas.'); await load(); }
    catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  async function addMember(event) {
    event.preventDefault(); if (!selected || !memberId) return;
    setSaving(true); setError('');
    try { await requestJson(`/lms/admin/classes/${selected.id}/members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: memberId, role: memberRole }) }); setNotice('Keanggotaan kelas diperbarui.'); await load(); }
    catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  async function toggleClass() {
    if (!selected) return;
    setSaving(true); setError('');
    try {
      await requestJson(`/lms/admin/classes/${selected.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: selected.name, academicYear: selected.academicYear, description: selected.description ?? '', isActive: !selected.isActive }) });
      setNotice(selected.isActive ? 'Kelas dinonaktifkan. Data pembelajaran tetap tersimpan.' : 'Kelas diaktifkan.'); await load();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  async function removeMember(id) {
    if (!selected || !window.confirm('Lepaskan pengguna ini dari kelas?')) return;
    try { await requestJson(`/lms/admin/classes/${selected.id}/members/${id}`, { method: 'DELETE' }); setNotice('Keanggotaan dihapus.'); await load(); }
    catch (e) { setError(e.message); }
  }

  async function removeSubject(subjectId) {
    if (!selected) return;
    try { await requestJson(`/lms/admin/classes/${selected.id}/subjects/${subjectId}`, { method: 'DELETE' }); setNotice('Mata pelajaran dilepas dari kelas.'); await load(); }
    catch (e) { setError(e.message); }
  }

  return <LmsShell user={user} eyebrow="Persiapan LMS" title="Kelas dan keanggotaan">
    {error && <Alert tone="danger" role="alert">{error}</Alert>}{notice && <Alert tone="info" role="status">{notice}</Alert>}
    <div className="lms-admin-grid">
      <Card><h2>Buat kelas</h2><form className="form-stack" onSubmit={createClass}><Input label="Nama kelas" required maxLength={120} value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} /><Input label="Tahun ajaran" required maxLength={30} placeholder="Contoh: 2026/2027" value={classForm.academicYear} onChange={(e) => setClassForm({ ...classForm, academicYear: e.target.value })} /><TextArea label="Keterangan" rows={3} maxLength={1000} value={classForm.description} onChange={(e) => setClassForm({ ...classForm, description: e.target.value })} /><Button disabled={saving}>{saving ? 'Menyimpan…' : 'Buat kelas'}</Button></form></Card>
      <Card><h2>Daftar kelas</h2>{classes.length ? <div className="lms-class-list">{classes.map((item) => <button className={selectedId === item.id ? 'lms-class-option selected' : 'lms-class-option'} key={item.id} onClick={() => setSelectedId(item.id)}><strong>{item.name}</strong><span>{item.academicYear} · {item.isActive ? 'Aktif' : 'Nonaktif'}</span></button>)}</div> : <EmptyState title="Belum ada kelas" description="Buat kelas untuk mulai mengatur guru, siswa, dan mata pelajaran." />}</Card>
    </div>
    {selected && <section className="surface-card lms-setup-detail"><div className="page-heading"><div><p className="eyebrow">{selected.academicYear}</p><h2>{selected.name}</h2>{selected.description && <p className="muted">{selected.description}</p>}</div><Button variant="secondary" onClick={toggleClass} disabled={saving}>{selected.isActive ? 'Nonaktifkan kelas' : 'Aktifkan kelas'}</Button></div>
      <div className="lms-admin-grid">
        <section><h3>Mata pelajaran</h3>{selected.subjects.length ? <ul className="lms-member-list">{selected.subjects.map((item) => <li key={item.id}><span>{item.name}</span><Button variant="secondary" onClick={() => removeSubject(item.id)}>Lepas</Button></li>)}</ul> : <p className="muted">Belum ada mata pelajaran pada kelas ini.</p>}
          <form className="inline-admin-form" onSubmit={linkSubject}><div className="field"><label htmlFor="class-subject">Hubungkan mata pelajaran</label><select id="class-subject" className="input" value={classSubjectId} onChange={(e) => setClassSubjectId(e.target.value)}><option value="">Pilih mata pelajaran</option>{subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div><Button disabled={saving || !classSubjectId || !selected.isActive}>Hubungkan</Button></form>
          <form className="inline-admin-form" onSubmit={addSubject}><Input label="Mata pelajaran baru" required maxLength={120} value={subjectName} onChange={(e) => setSubjectName(e.target.value)} /><Button variant="secondary" disabled={saving}>Buat</Button></form>
        </section>
        <section><h3>Guru dan siswa</h3>{selected.members.length ? <ul className="lms-member-list">{selected.members.map((member) => <li key={`${member.userId}-${member.role}`}><span><strong>{member.role === 'teacher' ? 'Guru' : 'Siswa'}:</strong> {member.displayName}<small>{member.email}</small></span><Button variant="secondary" onClick={() => removeMember(member.userId)}>Lepas</Button></li>)}</ul> : <p className="muted">Belum ada anggota.</p>}
          <form className="inline-admin-form" onSubmit={addMember}><div className="field"><label htmlFor="member-role">Role</label><select id="member-role" className="input" value={memberRole} onChange={(e) => { setMemberRole(e.target.value); setMemberId(''); }}><option value="teacher">Guru</option><option value="student">Siswa</option></select></div><div className="field"><label htmlFor="member-user">Akun</label><select id="member-user" className="input" required value={memberId} onChange={(e) => setMemberId(e.target.value)}><option value="">Pilih akun</option>{(memberRole === 'teacher' ? teachers : students).map((item) => <option key={item.id} value={item.id}>{item.displayName} — {item.email}</option>)}</select></div><Button disabled={saving || !selected.isActive}>Tambahkan</Button></form>
        </section>
      </div>
    </section>}
  </LmsShell>;
}

function TeacherWorkspace({ user }) {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [course, setCourse] = useState(null);
  const [tab, setTab] = useState('materials');
  const [editing, setEditing] = useState(null);
  const [assignmentId, setAssignmentId] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [gradeDrafts, setGradeDrafts] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadClasses() {
    const items = await requestJson('/lms/teacher/classes'); setClasses(items);
    setClassId((current) => current || items[0]?.id || '');
  }
  async function loadCourse(id = classId) {
    if (!id) { setCourse(null); setLoading(false); return; }
    setLoading(true); setError('');
    try { setCourse(await requestJson(`/lms/teacher/classes/${id}`)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadClasses().catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (classId) loadCourse(classId); }, [classId]);

  function beginNew(kind) { setEditing({ kind, id: null, title: '', subjectId: '', body: '', description: '', dueAt: '', allowResubmission: false }); setError(''); setNotice(''); }
  function beginEdit(kind, item) {
    setEditing({ kind, id: item.id, title: item.title, subjectId: item.subjectId ?? '', body: item.body ?? '', description: item.description ?? '', dueAt: toLocalDateTime(item.dueAt), allowResubmission: item.allowResubmission ?? false, attachmentName: item.attachmentName });
    setError(''); setNotice('');
  }

  async function saveLearningItem(event) {
    event.preventDefault(); if (!editing || !classId) return;
    setSaving(true); setError(''); setNotice('');
    const form = new FormData();
    for (const [key, value] of Object.entries(editing)) if (!['kind', 'id', 'attachmentName'].includes(key)) form.set(key, value ?? '');
    if (editing.attachmentName) form.set('attachmentName', editing.attachmentName);
    const file = event.currentTarget.elements.namedItem('file')?.files?.[0]; if (file) form.set('file', file);
    let path; let method;
    if (editing.kind === 'material') { path = editing.id ? `/lms/teacher/materials/${editing.id}` : `/lms/teacher/classes/${classId}/materials`; method = editing.id ? 'PUT' : 'POST'; }
    else { path = editing.id ? `/lms/teacher/assignments/${editing.id}` : `/lms/teacher/classes/${classId}/assignments`; method = editing.id ? 'PUT' : 'POST'; }
    try { await requestJson(path, { method, body: form }); setNotice('Konten pembelajaran berhasil disimpan.'); setEditing(null); await loadCourse(); }
    catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  async function openSubmissions(assignment) {
    setAssignmentId(assignment.id); setError('');
    try {
      const items = await requestJson(`/lms/teacher/classes/${classId}/assignments/${assignment.id}/submissions`);
      setSubmissions(items); setGradeDrafts(Object.fromEntries(items.map((item) => [item.id, { score: item.score ?? '', feedback: item.feedback ?? '', isPublished: item.isPublished ?? false }])));
    } catch (e) { setError(e.message); }
  }

  async function saveGrade(submissionId) {
    setSaving(true); setError(''); setNotice('');
    try {
      await requestJson(`/lms/teacher/submissions/${submissionId}/grade`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(gradeDrafts[submissionId]) });
      setNotice('Nilai/umpan balik tersimpan. Hanya hasil yang dipublikasikan terlihat siswa.'); await openSubmissions(course.assignments.find((item) => item.id === assignmentId));
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  return <LmsShell user={user} eyebrow="Ruang guru" title="Kelas dan pembelajaran">
    {error && <Alert tone="danger" role="alert">{error}</Alert>}{notice && <Alert tone="info" role="status">{notice}</Alert>}
    {!classes.length && !loading ? <EmptyState title="Belum ada kelas yang ditugaskan" description="Hubungi admin sekolah untuk menambahkan akun Anda sebagai guru di kelas." /> : <>
      <div className="field class-picker"><label htmlFor="teacher-class">Kelas</label><select id="teacher-class" className="input" value={classId} onChange={(e) => { setClassId(e.target.value); setEditing(null); setAssignmentId(''); }}><option value="">Pilih kelas</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.academicYear}</option>)}</select></div>
      {loading ? <div className="state-wrap"><Spinner /> Memuat kelas…</div> : course && <>
        <Card className="lms-course-head"><p className="eyebrow">{course.academicYear}</p><h2>{course.name}</h2>{course.description && <p>{course.description}</p>}<p className="muted">Mata pelajaran: {course.subjects.map((item) => item.name).join(', ') || 'Belum ditetapkan'}</p></Card>
        <div className="ppdb-admin-tabs" role="tablist" aria-label="Menu pembelajaran"><button role="tab" aria-selected={tab === 'materials'} className={tab === 'materials' ? 'selected' : ''} onClick={() => { setTab('materials'); setAssignmentId(''); }}>Materi</button><button role="tab" aria-selected={tab === 'assignments'} className={tab === 'assignments' ? 'selected' : ''} onClick={() => { setTab('assignments'); setAssignmentId(''); }}>Tugas dan pengumpulan</button></div>
        {editing ? <TeacherEditor editing={editing} setEditing={setEditing} subjects={course.subjects} onSubmit={saveLearningItem} saving={saving} /> : tab === 'materials' ? <section className="lms-section"><div className="section-heading"><div><p className="eyebrow">Bahan belajar</p><h2>Materi kelas</h2></div><Button onClick={() => beginNew('material')}>Unggah materi</Button></div>{course.materials.length ? <div className="lms-card-grid">{course.materials.map((item) => <Card key={item.id}><div className="lms-item-top"><div><h3>{item.title}</h3><p className="muted">{item.subjectName || 'Umum'} · {formatDate(item.createdAt)}</p></div><Button variant="secondary" onClick={() => beginEdit('material', item)}>Ubah</Button></div>{item.body && <p className="formatted-copy">{item.body}</p>}{item.attachmentName && <button className="text-link file-download" onClick={() => downloadFile('material', item.id, item.attachmentName).catch((e) => setError(e.message))}>Unduh {item.attachmentName}</button>}</Card>)}</div> : <EmptyState title="Belum ada materi" description="Unggah materi untuk kelas yang Anda ampu." />}</section> : <TeacherAssignmentList course={course} onNew={() => beginNew('assignment')} onEdit={(item) => beginEdit('assignment', item)} onSubmissions={openSubmissions} />}
        {tab === 'assignments' && assignmentId && <SubmissionReview submissions={submissions} drafts={gradeDrafts} setDrafts={setGradeDrafts} onSave={saveGrade} saving={saving} />}
      </>}
    </>}
  </LmsShell>;
}

function TeacherEditor({ editing, setEditing, subjects, onSubmit, saving }) {
  const update = (key, value) => setEditing((current) => ({ ...current, [key]: value }));
  const isMaterial = editing.kind === 'material';
  return <Card className="lms-editor"><div className="section-heading"><div><p className="eyebrow">{editing.id ? 'Perbarui' : 'Buat'} {isMaterial ? 'materi' : 'tugas'}</p><h2>{isMaterial ? 'Materi pembelajaran' : 'Tugas kelas'}</h2></div><Button variant="secondary" onClick={() => setEditing(null)}>Tutup</Button></div>
    <form className="form-stack" onSubmit={onSubmit}>
      <Input label="Judul" required maxLength={180} value={editing.title} onChange={(e) => update('title', e.target.value)} />
      <div className="field"><label htmlFor="lms-subject">Mata pelajaran</label><select id="lms-subject" className="input" value={editing.subjectId} onChange={(e) => update('subjectId', e.target.value)}><option value="">Tanpa mata pelajaran</option>{subjects.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>
      {isMaterial ? <TextArea label="Isi materi" rows={6} maxLength={30000} value={editing.body} onChange={(e) => update('body', e.target.value)} /> : <><TextArea label="Deskripsi tugas" required rows={6} maxLength={30000} value={editing.description} onChange={(e) => update('description', e.target.value)} /><Input label="Tenggat" type="datetime-local" required value={editing.dueAt} onChange={(e) => update('dueAt', e.target.value)} /><label className="check-field"><input type="checkbox" checked={editing.allowResubmission} onChange={(e) => update('allowResubmission', e.target.checked)} /> Izinkan pengumpulan ulang sebelum tenggat</label></>}
      <div className="field"><label htmlFor="lms-file">Lampiran (PDF, JPEG, PNG, WebP; maks. 10 MB)</label><input id="lms-file" name="file" type="file" className="input file-input" accept="application/pdf,image/jpeg,image/png,image/webp" /><small className="muted">{editing.attachmentName ? `Lampiran saat ini: ${editing.attachmentName}. File lama tetap dipakai jika tidak memilih file baru.` : 'Lampiran bersifat opsional.'}</small></div>
      <Button type="submit" disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
    </form>
  </Card>;
}

function TeacherAssignmentList({ course, onNew, onEdit, onSubmissions }) {
  return <section className="lms-section"><div className="section-heading"><div><p className="eyebrow">Pekerjaan siswa</p><h2>Tugas kelas</h2></div><Button onClick={onNew}>Buat tugas</Button></div>{course.assignments.length ? <div className="lms-card-grid">{course.assignments.map((item) => <Card key={item.id}><div className="lms-item-top"><div><h3>{item.title}</h3><p className="muted">{item.subjectName || 'Umum'} · Tenggat {formatDateTime(item.dueAt)}</p></div><Button variant="secondary" onClick={() => onEdit(item)}>Ubah</Button></div><p className="formatted-copy">{item.description}</p><p className="muted">Pengumpulan: {item.submissionCount}{item.allowResubmission ? ' · Pengumpulan ulang diizinkan' : ''}</p>{item.attachmentName && <button className="text-link file-download" onClick={() => downloadFile('assignment', item.id, item.attachmentName).catch(() => {})}>Unduh {item.attachmentName}</button>}<Button variant="secondary" onClick={() => onSubmissions(item)}>Periksa pengumpulan</Button></Card>)}</div> : <EmptyState title="Belum ada tugas" description="Buat tugas untuk kelas ini." />}</section>;
}

function SubmissionReview({ submissions, drafts, setDrafts, onSave, saving }) {
  return <section className="lms-section"><h2>Pengumpulan siswa</h2>{submissions.length ? <div className="lms-card-grid">{submissions.map((item) => <Card key={item.id}><div className="lms-item-top"><div><h3>{item.studentName}</h3><p className="muted">{item.studentEmail} · {formatDateTime(item.submittedAt)}</p></div><span className="status-label" data-status={item.isPublished ? 'published' : item.score != null || item.feedback ? 'graded_unpublished' : 'needs_review'}>{item.isPublished ? 'Nilai terbit' : item.score != null || item.feedback ? 'Dinilai · belum terbit' : 'Perlu diperiksa'}</span></div>{item.content && <p className="formatted-copy">{item.content}</p>}{item.attachmentName && <button className="text-link file-download" onClick={() => downloadFile('submission', item.id, item.attachmentName).catch(() => {})}>Unduh {item.attachmentName}</button>}
      <div className="form-grid grade-fields"><Input label="Nilai (0–100)" type="number" min="0" max="100" step="0.01" value={drafts[item.id]?.score ?? ''} onChange={(e) => setDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], score: e.target.value } }))} /><TextArea label="Umpan balik" rows={3} maxLength={5000} value={drafts[item.id]?.feedback ?? ''} onChange={(e) => setDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], feedback: e.target.value } }))} /></div>
      <label className="check-field"><input type="checkbox" checked={Boolean(drafts[item.id]?.isPublished)} onChange={(e) => setDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], isPublished: e.target.checked } }))} /> Publikasikan nilai/umpan balik kepada siswa</label><Button onClick={() => onSave(item.id)} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan penilaian'}</Button>
    </Card>)}</div> : <EmptyState title="Belum ada pengumpulan" description="Pengumpulan siswa untuk tugas ini akan muncul di sini." />}</section>;
}

function StudentWorkspace({ user }) {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [course, setCourse] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submissionText, setSubmissionText] = useState({});
  const [selectedFiles, setSelectedFiles] = useState({});
  const [notice, setNotice] = useState('');

  async function loadClasses() {
    const items = await requestJson('/lms/student/classes'); setClasses(items);
    setClassId((current) => current || items[0]?.id || '');
  }
  async function loadCourse(id = classId) {
    if (!id) { setCourse(null); setLoading(false); return; }
    setLoading(true); setError('');
    try { setCourse(await requestJson(`/lms/student/classes/${id}`)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadClasses().catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (classId) loadCourse(classId); }, [classId]);

  async function submit(assignmentId) {
    setSaving(true); setError(''); setNotice('');
    const form = new FormData(); form.set('content', submissionText[assignmentId] ?? '');
    if (selectedFiles[assignmentId]) form.set('file', selectedFiles[assignmentId]);
    try {
      await requestJson(`/lms/student/assignments/${assignmentId}/submissions`, { method: 'POST', body: form });
      setNotice('Pengumpulan berhasil disimpan.'); setSubmissionText((current) => ({ ...current, [assignmentId]: '' })); setSelectedFiles((current) => ({ ...current, [assignmentId]: null })); await loadCourse();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  return <LmsShell user={user} eyebrow="Ruang siswa" title="Kelas dan pembelajaran">
    {error && <Alert tone="danger" role="alert">{error}</Alert>}{notice && <Alert tone="info" role="status">{notice}</Alert>}
    {!classes.length && !loading ? <EmptyState title="Belum ada kelas" description="Admin sekolah akan menambahkan akun Anda ke kelas yang diikuti." /> : <>
      <div className="field class-picker"><label htmlFor="student-class">Kelas</label><select id="student-class" className="input" value={classId} onChange={(e) => setClassId(e.target.value)}><option value="">Pilih kelas</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.academicYear}</option>)}</select></div>
      {loading ? <div className="state-wrap"><Spinner /> Memuat kelas…</div> : course && <>
        <Card className="lms-course-head"><p className="eyebrow">{course.academicYear}</p><h2>{course.name}</h2>{course.description && <p>{course.description}</p>}<p className="muted">Mata pelajaran: {course.subjects.map((item) => item.name).join(', ') || 'Belum ditetapkan'}</p></Card>
        <section className="lms-section"><h2>Materi pembelajaran</h2>{course.materials.length ? <div className="lms-card-grid">{course.materials.map((item) => <Card key={item.id}><h3>{item.title}</h3><p className="muted">{item.subjectName || 'Umum'} · {formatDate(item.createdAt)}</p>{item.body && <p className="formatted-copy">{item.body}</p>}{item.attachmentName && <button className="text-link file-download" onClick={() => downloadFile('material', item.id, item.attachmentName).catch((e) => setError(e.message))}>Unduh {item.attachmentName}</button>}</Card>)}</div> : <EmptyState title="Belum ada materi" description="Materi akan muncul setelah guru membagikannya." />}</section>
        <section className="lms-section"><h2>Tugas dan pengumpulan</h2>{course.assignments.length ? <div className="lms-card-grid">{course.assignments.map((item) => {
          const submitted = Boolean(item.submissionId); const pastDue = item.dueAt && new Date(item.dueAt).getTime() < Date.now();
          const canSubmit = !pastDue && (!submitted || item.allowResubmission);
          return <Card key={item.id} className="assignment-card"><div className="lms-item-top"><div><h3>{item.title}</h3><p className="muted">{item.subjectName || 'Umum'} · Tenggat {formatDateTime(item.dueAt)}</p></div><span className="status-label" data-status={item.isGraded ? 'graded' : submitted ? 'submitted' : pastDue ? 'late' : 'pending'}>{item.isGraded ? 'Dinilai' : submitted ? 'Dikumpulkan' : pastDue ? 'Tenggat lewat' : 'Belum dikumpulkan'}</span></div><p className="formatted-copy">{item.description}</p>{item.attachmentName && <button className="text-link file-download" onClick={() => downloadFile('assignment', item.id, item.attachmentName).catch((e) => setError(e.message))}>Unduh lampiran tugas</button>}
            {submitted && <div className="student-submission-summary"><h4>Pengumpulan Anda</h4><p>{item.submissionContent || 'File terlampir.'}</p>{item.submissionAttachmentName && <button className="text-link file-download" onClick={() => downloadFile('submission', item.submissionId, item.submissionAttachmentName).catch((e) => setError(e.message))}>Unduh file yang dikumpulkan</button>}{item.isGraded ? <div className="published-grade"><p><strong>Nilai:</strong> {item.score ?? 'Belum diberikan'}</p>{item.feedback && <p><strong>Umpan balik:</strong> {item.feedback}</p>}</div> : <p className="muted">Nilai/umpan balik belum dipublikasikan.</p>}</div>}
            {canSubmit ? <div className="student-submit-form"><TextArea label={submitted ? 'Jawaban baru (opsional jika mengganti file)' : 'Jawaban'} rows={4} maxLength={20000} value={submissionText[item.id] ?? (submitted ? item.submissionContent ?? '' : '')} onChange={(e) => setSubmissionText((current) => ({ ...current, [item.id]: e.target.value }))} /><div className="field"><label htmlFor={`submission-file-${item.id}`}>{submitted ? 'File baru (opsional)' : 'File jawaban (opsional jika menulis jawaban)'}</label><input id={`submission-file-${item.id}`} className="input file-input" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={(e) => setSelectedFiles((current) => ({ ...current, [item.id]: e.target.files?.[0] ?? null }))} /><small className="muted">PDF/JPEG/PNG/WebP, maksimal 10 MB. File lama tetap terlampir jika tidak memilih file baru.</small></div><Button disabled={saving}>{saving ? 'Mengirim…' : submitted ? 'Kirim ulang' : 'Kumpulkan tugas'}</Button></div> : item.allowResubmission && pastDue ? <p className="muted">Pengumpulan ulang tidak tersedia setelah tenggat.</p> : null}
          </Card>;
        })}</div> : <EmptyState title="Belum ada tugas" description="Tugas dari guru akan muncul di sini." />}</section>
      </>}
    </>}
  </LmsShell>;
}

function LmsShell({ user, eyebrow, title, children }) {
  async function logout() { await requestJson('/auth/logout', { method: 'POST' }).catch(() => {}); window.location.assign('/'); }
  return <DashboardLayout user={user} onLogout={logout} loggingOut={false}><div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div></div><div className="lms-page-content">{children}</div></DashboardLayout>;
}

async function downloadFile(type, id, filename) {
  const response = await fetch(`${API_URL}/lms/files/${type}/${id}`, { credentials: 'include' });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message ?? 'File tidak dapat diunduh.');
  }
  const objectUrl = URL.createObjectURL(await response.blob());
  const link = document.createElement('a'); link.href = objectUrl; link.download = filename; link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function formatDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeZone: 'Asia/Jakarta' }).format(new Date(value));
}
function formatDateTime(value) {
  if (!value) return 'Tidak ditentukan';
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(value));
}
function toLocalDateTime(value) {
  if (!value) return '';
  const date = new Date(value); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
