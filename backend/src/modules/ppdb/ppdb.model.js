import { pool } from '../../database/pool.js';

const PERIOD_COLUMNS = 'id, name, starts_at AS "startsAt", ends_at AS "endsAt", is_open AS "isOpen", is_published AS "isPublished", created_at AS "createdAt"';
const REQUIREMENT_COLUMNS = 'id, period_id AS "periodId", name, description, is_required AS "isRequired", allowed_mime_types AS "allowedMimeTypes", max_bytes AS "maxBytes", display_order AS "displayOrder"';
const SCHEDULE_COLUMNS = 'id, period_id AS "periodId", title, description, starts_at AS "startsAt", ends_at AS "endsAt", display_order AS "displayOrder"';
const ANNOUNCEMENT_COLUMNS = 'id, period_id AS "periodId", title, body, published_at AS "publishedAt", created_at AS "createdAt"';

export async function getPublicConfiguration() {
  const periodResult = await pool.query(
    `SELECT ${PERIOD_COLUMNS} FROM ppdb_periods
     WHERE is_published = true AND (ends_at IS NULL OR ends_at >= now())
     ORDER BY CASE WHEN starts_at IS NULL OR starts_at <= now() THEN 0 ELSE 1 END,
       starts_at ASC NULLS FIRST LIMIT 1`,
  );
  const selectedPeriod = periodResult.rows[0] ?? null;
  const now = Date.now();
  const starts = selectedPeriod?.startsAt ? new Date(selectedPeriod.startsAt).getTime() : null;
  const ends = selectedPeriod?.endsAt ? new Date(selectedPeriod.endsAt).getTime() : null;
  const period = selectedPeriod ? {
    ...selectedPeriod,
    isRegistrationOpen: selectedPeriod.isOpen && (starts == null || starts <= now) && (ends == null || ends >= now),
  } : null;
  const [announcements, requirements, schedule] = await Promise.all([
    pool.query(`SELECT ${ANNOUNCEMENT_COLUMNS} FROM announcements
      WHERE published_at IS NOT NULL AND published_at <= now() AND (period_id IS NULL OR period_id = $1)
      ORDER BY published_at DESC`, [period?.id ?? null]),
    period ? pool.query(`SELECT ${REQUIREMENT_COLUMNS} FROM ppdb_requirements WHERE period_id = $1 ORDER BY display_order, name`, [period.id]) : { rows: [] },
    period ? pool.query(`SELECT ${SCHEDULE_COLUMNS} FROM ppdb_schedule_items WHERE period_id = $1 ORDER BY display_order, starts_at NULLS LAST`, [period.id]) : { rows: [] },
  ]);
  return { period, requirements: requirements.rows, schedule: schedule.rows, announcements: announcements.rows };
}

export async function createApplicantApplication(data, passwordHash) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const periodResult = await client.query(
      `SELECT id FROM ppdb_periods
       WHERE is_open = true AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at >= now())
       ORDER BY starts_at DESC NULLS LAST LIMIT 1 FOR SHARE`,
    );
    if (!periodResult.rows[0]) {
      const error = new Error('Pendaftaran belum dibuka atau sudah ditutup.'); error.status = 409; error.code = 'PPDB_CLOSED'; throw error;
    }
    const periodId = periodResult.rows[0].id;
    const userResult = await client.query(
      `INSERT INTO users (role_id, email, password_hash, display_name)
       VALUES ((SELECT id FROM roles WHERE name = 'applicant'), $1, $2, $3)
       RETURNING id, email, display_name AS "displayName"`,
      [data.email, passwordHash, data.fullName],
    );
    const user = userResult.rows[0];
    const sequence = await client.query("SELECT nextval('ppdb_registration_number_seq') AS value");
    const registrationNumber = `PPDB-${String(sequence.rows[0].value).padStart(8, '0')}`;
    const applicantResult = await client.query(
      `INSERT INTO applicants (user_id, period_id, registration_number, full_name, phone, address, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'Draft')
       RETURNING id, registration_number AS "registrationNumber", full_name AS "fullName", phone, address, status, period_id AS "periodId"`,
      [user.id, periodId, registrationNumber, data.fullName, data.phone, data.address],
    );
    const applicant = applicantResult.rows[0];
    if (data.guardianName) {
      await client.query('INSERT INTO guardians (applicant_id, full_name, relationship, phone) VALUES ($1, $2, $3, $4)',
        [applicant.id, data.guardianName, data.guardianRelationship, data.guardianPhone]);
    }
    if (data.previousInstitution) {
      await client.query('INSERT INTO previous_education (applicant_id, institution_name, graduation_year) VALUES ($1, $2, $3)',
        [applicant.id, data.previousInstitution, data.previousGraduationYear]);
    }
    await client.query(
      `INSERT INTO application_status_histories (applicant_id, from_status, to_status, changed_by)
       VALUES ($1, NULL, 'Draft', $2)`, [applicant.id, user.id],
    );
    const session = await client.query(
      `INSERT INTO auth_sessions (user_id, token_hash, expires_at)
       VALUES ($1, $2, $3) RETURNING expires_at AS "expiresAt"`,
      [user.id, data.sessionTokenHash, data.sessionExpiresAt],
    );
    await client.query('COMMIT');
    return { user, applicant, session: session.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function getApplicantForUser(userId) {
  const applicantResult = await pool.query(
    `SELECT applicants.id, applicants.registration_number AS "registrationNumber", applicants.full_name AS "fullName",
       applicants.phone, applicants.address, applicants.status, applicants.period_id AS "periodId", applicants.created_at AS "createdAt",
       ppdb_periods.name AS "periodName", ppdb_periods.starts_at AS "periodStartsAt", ppdb_periods.ends_at AS "periodEndsAt", users.email
     FROM applicants JOIN ppdb_periods ON ppdb_periods.id = applicants.period_id
     JOIN users ON users.id=applicants.user_id
     WHERE applicants.user_id = $1`, [userId],
  );
  const applicant = applicantResult.rows[0];
  if (!applicant) return null;
  const [guardians, previousEducation, documents, histories, requirements] = await Promise.all([
    pool.query('SELECT full_name AS "fullName", relationship, phone FROM guardians WHERE applicant_id = $1', [applicant.id]),
    pool.query('SELECT institution_name AS "institutionName", graduation_year AS "graduationYear" FROM previous_education WHERE applicant_id = $1', [applicant.id]),
    pool.query(`SELECT application_documents.id, application_documents.requirement_id AS "requirementId", application_documents.original_name AS "originalName",
        application_documents.media_type AS "mediaType", application_documents.byte_size AS "byteSize", application_documents.uploaded_at AS "uploadedAt",
        ppdb_requirements.name AS "requirementName"
      FROM application_documents LEFT JOIN ppdb_requirements ON ppdb_requirements.id = application_documents.requirement_id
      WHERE application_documents.applicant_id = $1 AND application_documents.is_current = true ORDER BY application_documents.uploaded_at DESC`, [applicant.id]),
    pool.query(`SELECT from_status AS "fromStatus", to_status AS "toStatus", note, changed_at AS "changedAt"
      FROM application_status_histories WHERE applicant_id = $1 ORDER BY changed_at`, [applicant.id]),
    pool.query(`SELECT ${REQUIREMENT_COLUMNS} FROM ppdb_requirements WHERE period_id = $1 ORDER BY display_order, name`, [applicant.periodId]),
  ]);
  return { ...applicant, email: applicant.email, guardians: guardians.rows, previousEducation: previousEducation.rows[0] ?? null, documents: documents.rows, history: histories.rows, requirements: requirements.rows };
}

export async function updateApplicantDetails(userId, data) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const current = await client.query('SELECT id, status FROM applicants WHERE user_id=$1 FOR UPDATE', [userId]);
    if (!current.rows[0]) { await client.query('ROLLBACK'); return { notFound: true }; }
    if (!['Draft', 'Perlu Perbaikan'].includes(current.rows[0].status)) {
      const error = new Error('Data hanya dapat diperbarui saat status Draft atau Perlu Perbaikan.'); error.status = 409; error.code = 'APPLICATION_LOCKED'; throw error;
    }
    const id = current.rows[0].id;
    const result = await client.query('UPDATE applicants SET full_name=$1, phone=$2, address=$3, updated_at=now() WHERE id=$4 RETURNING id, full_name AS "fullName", phone, address',
      [data.fullName, data.phone, data.address, id]);
    await client.query('UPDATE users SET display_name=$1, updated_at=now() WHERE id=$2', [data.fullName, userId]);
    await client.query('DELETE FROM guardians WHERE applicant_id=$1', [id]);
    if (data.guardianName) await client.query('INSERT INTO guardians (applicant_id, full_name, relationship, phone) VALUES ($1,$2,$3,$4)',
      [id, data.guardianName, data.guardianRelationship, data.guardianPhone]);
    if (data.previousInstitution) {
      await client.query(`INSERT INTO previous_education (applicant_id, institution_name, graduation_year) VALUES ($1,$2,$3)
        ON CONFLICT (applicant_id) DO UPDATE SET institution_name=EXCLUDED.institution_name, graduation_year=EXCLUDED.graduation_year`,
      [id, data.previousInstitution, data.previousGraduationYear]);
    } else {
      await client.query('DELETE FROM previous_education WHERE applicant_id=$1', [id]);
    }
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function submitApplicantApplication(userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT id, period_id AS "periodId", status FROM applicants WHERE user_id=$1 FOR UPDATE', [userId]);
    const applicant = result.rows[0];
    if (!applicant) { await client.query('ROLLBACK'); return { notFound: true }; }
    if (!['Draft', 'Perlu Perbaikan'].includes(applicant.status)) {
      const error = new Error('Pendaftaran dengan status ini tidak dapat dikirim ulang.'); error.status = 409; error.code = 'INVALID_STATUS'; throw error;
    }
    const missing = await client.query(
      `SELECT req.name FROM ppdb_requirements req
       WHERE req.period_id=$1 AND req.is_required=true
       AND NOT EXISTS (SELECT 1 FROM application_documents doc WHERE doc.applicant_id=$2 AND doc.requirement_id=req.id AND doc.is_current=true)
       ORDER BY req.display_order, req.name`, [applicant.periodId, applicant.id],
    );
    if (missing.rows.length) {
      const error = new Error(`Dokumen wajib belum lengkap: ${missing.rows.map((row) => row.name).join(', ')}.`); error.status = 400; error.code = 'MISSING_DOCUMENTS'; throw error;
    }
    const previousStatus = applicant.status;
    const updated = await client.query("UPDATE applicants SET status='Dikirim', updated_at=now() WHERE id=$1 RETURNING id, registration_number AS \"registrationNumber\", status", [applicant.id]);
    await client.query(
      `INSERT INTO application_status_histories (applicant_id, from_status, to_status, changed_by)
       VALUES ($1, $2, 'Dikirim', $3)`, [applicant.id, previousStatus, userId],
    );
    await client.query('COMMIT');
    return updated.rows[0];
  } catch (error) {
    await client.query('ROLLBACK'); throw error;
  } finally { client.release(); }
}

export async function getAdminPeriods() {
  const result = await pool.query(
    `SELECT ${PERIOD_COLUMNS}, (SELECT count(*)::integer FROM applicants WHERE period_id=ppdb_periods.id) AS "applicantCount"
     FROM ppdb_periods ORDER BY starts_at DESC NULLS LAST, created_at DESC`,
  );
  return result.rows;
}

export async function savePeriod(item, id = null) {
  if (id) {
    const result = await pool.query(
      `UPDATE ppdb_periods SET name=$1, starts_at=$2, ends_at=$3, is_open=$4, is_published=$5 WHERE id=$6 RETURNING ${PERIOD_COLUMNS}`,
      [item.name, item.startsAt, item.endsAt, item.isOpen, item.isPublished, id],
    );
    return result.rows[0] ?? null;
  }
  const result = await pool.query(
    `INSERT INTO ppdb_periods (name, starts_at, ends_at, is_open, is_published) VALUES ($1,$2,$3,$4,$5) RETURNING ${PERIOD_COLUMNS}`,
    [item.name, item.startsAt, item.endsAt, item.isOpen, item.isPublished],
  );
  return result.rows[0];
}

export async function deletePeriod(id) {
  const result = await pool.query('DELETE FROM ppdb_periods WHERE id=$1 RETURNING id', [id]);
  return result.rowCount > 0;
}

export async function getAdminCollection(resource, periodId) {
  if (resource === 'requirements') {
    const result = await pool.query(`SELECT ${REQUIREMENT_COLUMNS} FROM ppdb_requirements WHERE ($1::uuid IS NULL OR period_id=$1) ORDER BY display_order, name`, [periodId]);
    return result.rows;
  }
  if (resource === 'schedule') {
    const result = await pool.query(`SELECT ${SCHEDULE_COLUMNS} FROM ppdb_schedule_items WHERE ($1::uuid IS NULL OR period_id=$1) ORDER BY display_order, starts_at NULLS LAST`, [periodId]);
    return result.rows;
  }
  const result = await pool.query(`SELECT ${ANNOUNCEMENT_COLUMNS}, (published_at IS NOT NULL) AS "isPublished" FROM announcements ORDER BY created_at DESC`);
  return result.rows;
}

export async function saveAdminItem(resource, item, id = null) {
  const tableMap = {
    requirements: {
      columns: ['period_id','name','description','is_required','allowed_mime_types','max_bytes','display_order'],
      values: [item.periodId,item.name,item.description,item.isRequired,item.allowedMimeTypes,item.maxBytes,item.displayOrder],
      returning: REQUIREMENT_COLUMNS,
    },
    schedule: {
      columns: ['period_id','title','description','starts_at','ends_at','display_order'],
      values: [item.periodId,item.title,item.description,item.startsAt,item.endsAt,item.displayOrder],
      returning: SCHEDULE_COLUMNS,
    },
    announcements: {
      columns: ['period_id','title','body','published_at'],
      values: [item.periodId,item.title,item.body,item.isPublished ? new Date() : null],
      returning: `${ANNOUNCEMENT_COLUMNS}, (published_at IS NOT NULL) AS "isPublished"`,
    },
  };
  const config = tableMap[resource];
  if (!config) return null;
  if (id) {
    const setList = config.columns.map((column, index) => `${column}=$${index + 1}`).join(', ');
    const result = await pool.query(`UPDATE ${resource === 'announcements' ? 'announcements' : `ppdb_${resource}`} SET ${setList} WHERE id=$${config.values.length + 1} RETURNING ${config.returning}`,
      [...config.values, id]);
    return result.rows[0] ?? null;
  }
  const placeholders = config.values.map((_, index) => `$${index + 1}`).join(',');
  const result = await pool.query(`INSERT INTO ${resource === 'announcements' ? 'announcements' : `ppdb_${resource}`} (${config.columns.join(',')}) VALUES (${placeholders}) RETURNING ${config.returning}`, config.values);
  return result.rows[0];
}

export async function deleteAdminItem(resource, id) {
  const table = { requirements: 'ppdb_requirements', schedule: 'ppdb_schedule_items', announcements: 'announcements' }[resource];
  const result = await pool.query(`DELETE FROM ${table} WHERE id=$1 RETURNING id`, [id]);
  return result.rowCount > 0;
}

export async function listAdminApplications({ status, search, periodId }) {
  const params = [];
  const clauses = [];
  if (status) { params.push(status); clauses.push(`applicants.status=$${params.length}`); }
  if (search) { params.push(`%${search}%`); clauses.push(`(applicants.registration_number ILIKE $${params.length} OR applicants.full_name ILIKE $${params.length} OR users.email ILIKE $${params.length})`); }
  if (periodId) { params.push(periodId); clauses.push(`applicants.period_id=$${params.length}`); }
  params.push(100);
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const result = await pool.query(
    `SELECT applicants.id, applicants.registration_number AS "registrationNumber", applicants.full_name AS "fullName", applicants.status,
       applicants.created_at AS "createdAt", users.email, ppdb_periods.name AS "periodName"
     FROM applicants JOIN users ON users.id=applicants.user_id JOIN ppdb_periods ON ppdb_periods.id=applicants.period_id
     ${where} ORDER BY applicants.created_at DESC LIMIT $${params.length}`,
    params,
  );
  return result.rows;
}

export async function getAdminApplication(id) {
  const result = await pool.query(
    `SELECT applicants.id, applicants.registration_number AS "registrationNumber", applicants.full_name AS "fullName", applicants.phone,
       applicants.address, applicants.status, applicants.created_at AS "createdAt", users.email, ppdb_periods.name AS "periodName", ppdb_periods.id AS "periodId"
     FROM applicants JOIN users ON users.id=applicants.user_id JOIN ppdb_periods ON ppdb_periods.id=applicants.period_id WHERE applicants.id=$1`, [id],
  );
  const applicant = result.rows[0];
  if (!applicant) return null;
  const [guardians, education, documents, histories, requirements] = await Promise.all([
    pool.query('SELECT id, full_name AS "fullName", relationship, phone FROM guardians WHERE applicant_id=$1', [id]),
    pool.query('SELECT institution_name AS "institutionName", graduation_year AS "graduationYear" FROM previous_education WHERE applicant_id=$1', [id]),
    pool.query(`SELECT doc.id, doc.requirement_id AS "requirementId", doc.original_name AS "originalName", doc.media_type AS "mediaType", doc.byte_size AS "byteSize", doc.uploaded_at AS "uploadedAt", req.name AS "requirementName"
      FROM application_documents doc LEFT JOIN ppdb_requirements req ON req.id=doc.requirement_id
      WHERE doc.applicant_id=$1 AND doc.is_current=true ORDER BY doc.uploaded_at DESC`, [id]),
    pool.query(`SELECT h.from_status AS "fromStatus", h.to_status AS "toStatus", h.note, h.changed_at AS "changedAt", u.display_name AS "changedBy"
      FROM application_status_histories h LEFT JOIN users u ON u.id=h.changed_by WHERE h.applicant_id=$1 ORDER BY h.changed_at`, [id]),
    pool.query(`SELECT ${REQUIREMENT_COLUMNS} FROM ppdb_requirements WHERE period_id=$1 ORDER BY display_order, name`, [applicant.periodId]),
  ]);
  return { ...applicant, guardians: guardians.rows, previousEducation: education.rows[0] ?? null, documents: documents.rows, history: histories.rows, requirements: requirements.rows };
}

export async function updateApplicationStatus(id, status, note, staffUserId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT status FROM applicants WHERE id=$1 FOR UPDATE', [id]);
    if (!result.rows[0]) { await client.query('ROLLBACK'); return null; }
    const currentStatus = result.rows[0].status;
    const transitions = { 'Dikirim': ['Perlu Perbaikan', 'Terverifikasi'], 'Terverifikasi': ['Lulus', 'Tidak Lulus'] };
    if (!transitions[currentStatus]?.includes(status)) {
      const error = new Error(`Perubahan status dari ${currentStatus} ke ${status} tidak diperbolehkan.`); error.status = 409; error.code = 'INVALID_STATUS_TRANSITION'; throw error;
    }
    await client.query('UPDATE applicants SET status=$1, updated_at=now() WHERE id=$2', [status, id]);
    await client.query(
      'INSERT INTO application_status_histories (applicant_id, from_status, to_status, note, changed_by) VALUES ($1,$2,$3,$4,$5)',
      [id, currentStatus, status, note, staffUserId],
    );
    await client.query('COMMIT');
    return { id, fromStatus: currentStatus, status, note };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function getApplicantUploadTarget(userId) {
  const result = await pool.query('SELECT id, period_id AS "periodId", status FROM applicants WHERE user_id=$1', [userId]);
  return result.rows[0] ?? null;
}

export async function saveApplicantDocument(userId, requirementId, file, storageKey, originalName, detectedMime) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const applicantResult = await client.query('SELECT id, period_id AS "periodId", status FROM applicants WHERE user_id=$1 FOR UPDATE', [userId]);
    const applicant = applicantResult.rows[0];
    if (!applicant) { await client.query('ROLLBACK'); return { notFound: true }; }
    if (!['Draft', 'Perlu Perbaikan'].includes(applicant.status)) {
      const error = new Error('Dokumen hanya dapat diunggah saat status Draft atau Perlu Perbaikan.'); error.status = 409; error.code = 'UPLOAD_CLOSED'; throw error;
    }
    const requirementResult = await client.query(
      'SELECT id, name, allowed_mime_types AS "allowedMimeTypes", max_bytes AS "maxBytes" FROM ppdb_requirements WHERE id=$1 AND period_id=$2',
      [requirementId, applicant.periodId],
    );
    const requirement = requirementResult.rows[0];
    if (!requirement) { const error = new Error('Persyaratan dokumen tidak ditemukan untuk periode pendaftaran ini.'); error.status = 404; error.code = 'REQUIREMENT_NOT_FOUND'; throw error; }
    if (!requirement.allowedMimeTypes.includes(detectedMime)) { const error = new Error(`Format file tidak sesuai persyaratan “${requirement.name}”.`); error.status = 400; error.code = 'DOCUMENT_TYPE_INVALID'; throw error; }
    if (file.size > Number(requirement.maxBytes)) { const error = new Error(`Ukuran file melebihi batas untuk “${requirement.name}”.`); error.status = 413; error.code = 'DOCUMENT_TOO_LARGE'; throw error; }
    await client.query('UPDATE application_documents SET is_current=false WHERE applicant_id=$1 AND requirement_id=$2 AND is_current=true', [applicant.id, requirement.id]);
    const result = await client.query(
      `INSERT INTO application_documents (applicant_id, requirement_id, storage_key, original_name, media_type, byte_size)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, requirement_id AS "requirementId", original_name AS "originalName", media_type AS "mediaType", byte_size AS "byteSize", uploaded_at AS "uploadedAt"`,
      [applicant.id, requirement.id, storageKey, originalName, detectedMime, file.size],
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function getAuthorizedDocument(documentId, user) {
  const isStaff = user.role === 'admin_ppdb';
  const result = await pool.query(
    `SELECT doc.storage_key AS "storageKey", doc.original_name AS "originalName", doc.media_type AS "mediaType"
     FROM application_documents doc JOIN applicants a ON a.id=doc.applicant_id
     WHERE doc.id=$1 AND doc.is_current=true AND ($2::boolean=true OR a.user_id=$3)`,
    [documentId, isStaff, user.id],
  );
  return result.rows[0] ?? null;
}
