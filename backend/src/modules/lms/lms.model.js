import { pool } from '../../database/pool.js';

const CLASS_COLUMNS = 'c.id, c.name, c.academic_year AS "academicYear", c.description, c.is_active AS "isActive", c.created_at AS "createdAt"';
const MATERIAL_COLUMNS = 'm.id, m.class_id AS "classId", m.subject_id AS "subjectId", m.title, m.body, m.attachment_name AS "attachmentName", m.attachment_mime AS "attachmentMime", m.attachment_bytes AS "attachmentBytes", m.created_at AS "createdAt", m.updated_at AS "updatedAt"';
const ASSIGNMENT_COLUMNS = 'a.id, a.class_id AS "classId", a.subject_id AS "subjectId", a.title, a.description, a.due_at AS "dueAt", a.attachment_name AS "attachmentName", a.attachment_mime AS "attachmentMime", a.attachment_bytes AS "attachmentBytes", a.allow_resubmission AS "allowResubmission", a.created_at AS "createdAt", a.updated_at AS "updatedAt"';

export async function getAdminUsers(role) {
  const result = await pool.query(
    `SELECT users.id, users.display_name AS "displayName", users.email
     FROM users JOIN roles ON roles.id=users.role_id
     WHERE roles.name=$1 AND users.is_active=true ORDER BY users.display_name LIMIT 500`, [role],
  );
  return result.rows;
}

export async function getSubjects() {
  const result = await pool.query('SELECT id, name FROM subjects ORDER BY name');
  return result.rows;
}

export async function createSubject(name) {
  const result = await pool.query('INSERT INTO subjects (name) VALUES ($1) RETURNING id, name', [name]);
  return result.rows[0];
}

export async function getAdminClasses() {
  const result = await pool.query(`SELECT ${CLASS_COLUMNS} FROM classes c ORDER BY c.academic_year DESC, c.name`);
  return Promise.all(result.rows.map(async (item) => {
    const [members, subjects] = await Promise.all([
      pool.query(`SELECT cm.user_id AS "userId", cm.membership_role AS role, u.display_name AS "displayName", u.email
        FROM class_memberships cm JOIN users u ON u.id=cm.user_id WHERE cm.class_id=$1 ORDER BY cm.membership_role, u.display_name`, [item.id]),
      pool.query(`SELECT s.id, s.name FROM class_subjects cs JOIN subjects s ON s.id=cs.subject_id WHERE cs.class_id=$1 ORDER BY s.name`, [item.id]),
    ]);
    return { ...item, members: members.rows, subjects: subjects.rows };
  }));
}

export async function createClass(item, adminId) {
  const result = await pool.query(
    `INSERT INTO classes (name, academic_year, description, created_by) VALUES ($1,$2,$3,$4)
     RETURNING id, name, academic_year AS "academicYear", description, is_active AS "isActive", created_at AS "createdAt"`,
    [item.name, item.academicYear, item.description, adminId],
  );
  return { ...result.rows[0], members: [], subjects: [] };
}

export async function updateClass(id, item) {
  const result = await pool.query(
    `UPDATE classes SET name=$1, academic_year=$2, description=$3, is_active=$4
     WHERE id=$5 RETURNING id, name, academic_year AS "academicYear", description, is_active AS "isActive", created_at AS "createdAt"`,
    [item.name, item.academicYear, item.description, item.isActive, id],
  );
  return result.rows[0] ?? null;
}

export async function addClassMember(classId, userId, membershipRole) {
  const result = await pool.query(
    `INSERT INTO class_memberships (class_id, user_id, membership_role)
     SELECT c.id, u.id, $3 FROM classes c JOIN users u ON u.id=$2 JOIN roles r ON r.id=u.role_id
     WHERE c.id=$1 AND c.is_active=true AND r.name=$3
     ON CONFLICT (class_id, user_id) DO UPDATE SET membership_role=EXCLUDED.membership_role
     RETURNING class_id AS "classId", user_id AS "userId", membership_role AS role`,
    [classId, userId, membershipRole],
  );
  return result.rows[0] ?? null;
}

export async function removeClassMember(classId, userId) {
  const result = await pool.query('DELETE FROM class_memberships WHERE class_id=$1 AND user_id=$2 RETURNING user_id', [classId, userId]);
  return result.rowCount > 0;
}

export async function addClassSubject(classId, subjectId) {
  const result = await pool.query(
    `INSERT INTO class_subjects (class_id, subject_id)
     SELECT c.id, s.id FROM classes c JOIN subjects s ON s.id=$2 WHERE c.id=$1 AND c.is_active=true
     ON CONFLICT (class_id, subject_id) DO NOTHING RETURNING class_id AS "classId", subject_id AS "subjectId"`,
    [classId, subjectId],
  );
  if (result.rows[0]) return result.rows[0];
  const existing = await pool.query('SELECT class_id AS "classId", subject_id AS "subjectId" FROM class_subjects WHERE class_id=$1 AND subject_id=$2', [classId, subjectId]);
  return existing.rows[0] ?? null;
}

export async function removeClassSubject(classId, subjectId) {
  const result = await pool.query('DELETE FROM class_subjects WHERE class_id=$1 AND subject_id=$2 RETURNING subject_id', [classId, subjectId]);
  return result.rowCount > 0;
}

export async function getTeacherClasses(userId) {
  const result = await pool.query(
    `SELECT ${CLASS_COLUMNS} FROM classes c
     JOIN class_memberships cm ON cm.class_id=c.id AND cm.membership_role='teacher'
     WHERE cm.user_id=$1 AND c.is_active=true ORDER BY c.academic_year DESC, c.name`, [userId],
  );
  return Promise.all(result.rows.map(async (item) => {
    const subjects = await pool.query(`SELECT s.id, s.name FROM class_subjects cs JOIN subjects s ON s.id=cs.subject_id WHERE cs.class_id=$1 ORDER BY s.name`, [item.id]);
    return { ...item, subjects: subjects.rows };
  }));
}

export async function getTeacherClass(userId, classId) {
  const classResult = await pool.query(
    `SELECT ${CLASS_COLUMNS} FROM classes c JOIN class_memberships cm ON cm.class_id=c.id AND cm.membership_role='teacher'
     WHERE c.id=$1 AND cm.user_id=$2 AND c.is_active=true`, [classId, userId],
  );
  if (!classResult.rows[0]) return null;
  const [subjects, materials, assignments] = await Promise.all([
    pool.query(`SELECT s.id, s.name FROM class_subjects cs JOIN subjects s ON s.id=cs.subject_id WHERE cs.class_id=$1 ORDER BY s.name`, [classId]),
    pool.query(`SELECT ${MATERIAL_COLUMNS}, s.name AS "subjectName" FROM learning_materials m LEFT JOIN subjects s ON s.id=m.subject_id WHERE m.class_id=$1 ORDER BY m.created_at DESC`, [classId]),
    pool.query(`SELECT ${ASSIGNMENT_COLUMNS}, s.name AS "subjectName",
        (SELECT count(*)::integer FROM submissions sub WHERE sub.assignment_id=a.id) AS "submissionCount"
      FROM assignments a LEFT JOIN subjects s ON s.id=a.subject_id WHERE a.class_id=$1 ORDER BY a.due_at ASC NULLS LAST, a.created_at DESC`, [classId]),
  ]);
  return { ...classResult.rows[0], subjects: subjects.rows, materials: materials.rows, assignments: assignments.rows };
}

export async function getStudentClasses(userId) {
  const result = await pool.query(
    `SELECT ${CLASS_COLUMNS} FROM classes c
     JOIN class_memberships cm ON cm.class_id=c.id AND cm.membership_role='student'
     WHERE cm.user_id=$1 AND c.is_active=true ORDER BY c.academic_year DESC, c.name`, [userId],
  );
  return Promise.all(result.rows.map(async (item) => {
    const [subjects, work] = await Promise.all([
      pool.query(`SELECT s.id, s.name FROM class_subjects cs JOIN subjects s ON s.id=cs.subject_id WHERE cs.class_id=$1 ORDER BY s.name`, [item.id]),
      pool.query(`SELECT
          (SELECT count(*)::integer FROM learning_materials m WHERE m.class_id=$1) AS materials,
          (SELECT count(*)::integer FROM assignments a WHERE a.class_id=$1) AS assignments`, [item.id]),
    ]);
    return { ...item, subjects: subjects.rows, ...work.rows[0] };
  }));
}

export async function getStudentClass(userId, classId) {
  const classResult = await pool.query(
    `SELECT ${CLASS_COLUMNS} FROM classes c JOIN class_memberships cm ON cm.class_id=c.id AND cm.membership_role='student'
     WHERE c.id=$1 AND cm.user_id=$2 AND c.is_active=true`, [classId, userId],
  );
  if (!classResult.rows[0]) return null;
  const [subjects, materials, assignments] = await Promise.all([
    pool.query(`SELECT s.id, s.name FROM class_subjects cs JOIN subjects s ON s.id=cs.subject_id WHERE cs.class_id=$1 ORDER BY s.name`, [classId]),
    pool.query(`SELECT ${MATERIAL_COLUMNS}, s.name AS "subjectName" FROM learning_materials m
      LEFT JOIN subjects s ON s.id=m.subject_id WHERE m.class_id=$1 ORDER BY m.created_at DESC`, [classId]),
    pool.query(`SELECT ${ASSIGNMENT_COLUMNS}, s.name AS "subjectName", sub.id AS "submissionId", sub.content AS "submissionContent",
        sub.attachment_name AS "submissionAttachmentName", sub.submitted_at AS "submittedAt",
        (g.id IS NOT NULL) AS "isGraded", g.score, g.feedback
      FROM assignments a LEFT JOIN subjects s ON s.id=a.subject_id
      LEFT JOIN submissions sub ON sub.assignment_id=a.id AND sub.student_id=$2
      LEFT JOIN grades g ON g.submission_id=sub.id AND g.is_published=true
      WHERE a.class_id=$1 ORDER BY a.due_at ASC NULLS LAST, a.created_at DESC`, [classId, userId]),
  ]);
  return { ...classResult.rows[0], subjects: subjects.rows, materials: materials.rows, assignments: assignments.rows };
}

async function teacherOwnsClass(executor, teacherId, classId) {
  const result = await executor.query(
    `SELECT c.id FROM classes c JOIN class_memberships cm ON cm.class_id=c.id
     WHERE c.id=$1 AND c.is_active=true AND cm.user_id=$2 AND cm.membership_role='teacher'`, [classId, teacherId],
  );
  return Boolean(result.rows[0]);
}

async function validateClassSubject(executor, classId, subjectId) {
  if (!subjectId) return true;
  const result = await executor.query('SELECT 1 FROM class_subjects WHERE class_id=$1 AND subject_id=$2', [classId, subjectId]);
  return Boolean(result.rows[0]);
}

export async function createMaterial(teacherId, classId, item, file) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (!await teacherOwnsClass(client, teacherId, classId)) { await client.query('ROLLBACK'); return { forbidden: true }; }
    if (!await validateClassSubject(client, classId, item.subjectId)) { await client.query('ROLLBACK'); return { invalidSubject: true }; }
    const result = await client.query(
      `INSERT INTO learning_materials (class_id, subject_id, title, body, attachment_key, attachment_name, attachment_mime, attachment_bytes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, class_id AS "classId", subject_id AS "subjectId", title, body,
         attachment_name AS "attachmentName", attachment_mime AS "attachmentMime", attachment_bytes AS "attachmentBytes", created_at AS "createdAt"`,
      [classId, item.subjectId, item.title, item.body, file?.storageKey ?? null, file?.originalName ?? null, file?.mimeType ?? null, file?.byteSize ?? null, teacherId],
    );
    await client.query('COMMIT'); return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function updateMaterial(teacherId, materialId, item, file) {
  const current = await pool.query(
    `SELECT id, class_id AS "classId", attachment_key AS "attachmentKey" FROM learning_materials WHERE id=$1`, [materialId],
  );
  if (!current.rows[0]) return null;
  const old = current.rows[0];
  if (!await teacherOwnsClass(pool, teacherId, old.classId)) return { forbidden: true };
  if (!await validateClassSubject(pool, old.classId, item.subjectId)) return { invalidSubject: true };
  const result = await pool.query(
    `UPDATE learning_materials SET subject_id=$1, title=$2, body=$3,
       attachment_key=COALESCE($4, attachment_key), attachment_name=COALESCE($5, attachment_name),
       attachment_mime=COALESCE($6, attachment_mime), attachment_bytes=COALESCE($7, attachment_bytes), updated_at=now()
     WHERE id=$8 RETURNING id, class_id AS "classId", subject_id AS "subjectId", title, body,
       attachment_name AS "attachmentName", attachment_mime AS "attachmentMime", attachment_bytes AS "attachmentBytes", created_at AS "createdAt"`,
    [item.subjectId, item.title, item.body, file?.storageKey ?? null, file?.originalName ?? null, file?.mimeType ?? null, file?.byteSize ?? null, materialId],
  );
  return { ...result.rows[0], oldStorageKey: file ? old.attachmentKey : null };
}

export async function createAssignment(teacherId, classId, item, file) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (!await teacherOwnsClass(client, teacherId, classId)) { await client.query('ROLLBACK'); return { forbidden: true }; }
    if (!await validateClassSubject(client, classId, item.subjectId)) { await client.query('ROLLBACK'); return { invalidSubject: true }; }
    const result = await client.query(
      `INSERT INTO assignments (class_id, subject_id, title, description, due_at, attachment_key, attachment_name, attachment_mime, attachment_bytes, allow_resubmission, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id, class_id AS "classId", subject_id AS "subjectId", title, description,
         due_at AS "dueAt", attachment_name AS "attachmentName", attachment_mime AS "attachmentMime", attachment_bytes AS "attachmentBytes",
         allow_resubmission AS "allowResubmission", created_at AS "createdAt"`,
      [classId, item.subjectId, item.title, item.description, item.dueAt, file?.storageKey ?? null, file?.originalName ?? null, file?.mimeType ?? null, file?.byteSize ?? null, item.allowResubmission, teacherId],
    );
    await client.query('COMMIT'); return result.rows[0];
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function updateAssignment(teacherId, assignmentId, item, file) {
  const current = await pool.query('SELECT id, class_id AS "classId", attachment_key AS "attachmentKey" FROM assignments WHERE id=$1', [assignmentId]);
  if (!current.rows[0]) return null;
  const old = current.rows[0];
  if (!await teacherOwnsClass(pool, teacherId, old.classId)) return { forbidden: true };
  if (!await validateClassSubject(pool, old.classId, item.subjectId)) return { invalidSubject: true };
  const result = await pool.query(
    `UPDATE assignments SET subject_id=$1, title=$2, description=$3, due_at=$4,
       attachment_key=COALESCE($5, attachment_key), attachment_name=COALESCE($6, attachment_name),
       attachment_mime=COALESCE($7, attachment_mime), attachment_bytes=COALESCE($8, attachment_bytes), allow_resubmission=$9, updated_at=now()
     WHERE id=$10 RETURNING id, class_id AS "classId", subject_id AS "subjectId", title, description,
       due_at AS "dueAt", attachment_name AS "attachmentName", attachment_mime AS "attachmentMime", attachment_bytes AS "attachmentBytes",
       allow_resubmission AS "allowResubmission", created_at AS "createdAt"`,
    [item.subjectId, item.title, item.description, item.dueAt, file?.storageKey ?? null, file?.originalName ?? null, file?.mimeType ?? null, file?.byteSize ?? null, item.allowResubmission, assignmentId],
  );
  return { ...result.rows[0], oldStorageKey: file ? old.attachmentKey : null };
}

export async function getTeacherSubmissions(teacherId, classId, assignmentId) {
  if (!await teacherOwnsClass(pool, teacherId, classId)) return null;
  const assignment = await pool.query('SELECT id FROM assignments WHERE id=$1 AND class_id=$2', [assignmentId, classId]);
  if (!assignment.rows[0]) return null;
  const result = await pool.query(
    `SELECT sub.id, sub.assignment_id AS "assignmentId", sub.student_id AS "studentId", u.display_name AS "studentName", u.email AS "studentEmail",
       sub.content, sub.attachment_name AS "attachmentName", sub.attachment_mime AS "attachmentMime", sub.submitted_at AS "submittedAt", sub.updated_at AS "updatedAt",
       g.score, g.feedback, g.is_published AS "isPublished", g.updated_at AS "gradedAt"
     FROM submissions sub JOIN users u ON u.id=sub.student_id
     JOIN class_memberships cm ON cm.class_id=$2 AND cm.user_id=sub.student_id AND cm.membership_role='student'
     LEFT JOIN grades g ON g.submission_id=sub.id
     WHERE sub.assignment_id=$1 ORDER BY sub.submitted_at DESC`, [assignmentId, classId],
  );
  return result.rows;
}

export async function saveGrade(teacherId, submissionId, grade) {
  const result = await pool.query(
    `INSERT INTO grades (submission_id, score, feedback, is_published, graded_by)
     SELECT sub.id, $3, $4, $5, $1 FROM submissions sub
     JOIN assignments a ON a.id=sub.assignment_id
     JOIN class_memberships cm ON cm.class_id=a.class_id AND cm.user_id=$1 AND cm.membership_role='teacher'
     WHERE sub.id=$2 AND EXISTS (SELECT 1 FROM classes c WHERE c.id=a.class_id AND c.is_active=true)
     ON CONFLICT (submission_id) DO UPDATE SET score=EXCLUDED.score, feedback=EXCLUDED.feedback,
       is_published=EXCLUDED.is_published, graded_by=EXCLUDED.graded_by, updated_at=now()
     RETURNING id, submission_id AS "submissionId", score, feedback, is_published AS "isPublished", updated_at AS "updatedAt"`,
    [teacherId, submissionId, grade.score, grade.feedback, grade.isPublished],
  );
  return result.rows[0] ?? null;
}

export async function submitAssignment(studentId, assignmentId, submission, file) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const assignmentResult = await client.query(
      `SELECT a.id, a.class_id AS "classId", a.due_at AS "dueAt", a.allow_resubmission AS "allowResubmission"
       FROM assignments a JOIN classes c ON c.id=a.class_id AND c.is_active=true
       JOIN class_memberships cm ON cm.class_id=c.id AND cm.user_id=$2 AND cm.membership_role='student'
       WHERE a.id=$1 FOR UPDATE OF a`, [assignmentId, studentId],
    );
    const assignment = assignmentResult.rows[0];
    if (!assignment) { await client.query('ROLLBACK'); return { notFound: true }; }
    if (assignment.dueAt && new Date(assignment.dueAt).getTime() < Date.now()) {
      const error = new Error('Tenggat tugas sudah lewat.'); error.status = 409; error.code = 'DEADLINE_PASSED'; throw error;
    }
    const current = await client.query('SELECT id, attachment_key AS "attachmentKey" FROM submissions WHERE assignment_id=$1 AND student_id=$2 FOR UPDATE', [assignmentId, studentId]);
    if (current.rows[0] && !assignment.allowResubmission) {
      const error = new Error('Pengumpulan ulang tidak diaktifkan untuk tugas ini.'); error.status = 409; error.code = 'RESUBMISSION_DISABLED'; throw error;
    }
    if (!submission.content && !file && !current.rows[0]) {
      const error = new Error('Tulis jawaban atau unggah file sebelum mengumpulkan.'); error.status = 400; error.code = 'SUBMISSION_EMPTY'; throw error;
    }
    let result;
    if (current.rows[0]) {
      result = await client.query(
        `UPDATE submissions SET content=$1, attachment_key=COALESCE($2, attachment_key),
           attachment_name=COALESCE($3, attachment_name), attachment_mime=COALESCE($4, attachment_mime),
           attachment_bytes=COALESCE($5, attachment_bytes), submitted_at=now(), updated_at=now()
         WHERE id=$6 RETURNING id, assignment_id AS "assignmentId", content, attachment_name AS "attachmentName", submitted_at AS "submittedAt", updated_at AS "updatedAt"`,
        [submission.content, file?.storageKey ?? null, file?.originalName ?? null, file?.mimeType ?? null, file?.byteSize ?? null, current.rows[0].id],
      );
      await client.query('UPDATE grades SET score=NULL, feedback=NULL, is_published=false, graded_by=NULL, updated_at=now() WHERE submission_id=$1', [current.rows[0].id]);
    } else {
      result = await client.query(
        `INSERT INTO submissions (assignment_id, student_id, content, attachment_key, attachment_name, attachment_mime, attachment_bytes)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, assignment_id AS "assignmentId", content, attachment_name AS "attachmentName", submitted_at AS "submittedAt", updated_at AS "updatedAt"`,
        [assignmentId, studentId, submission.content, file?.storageKey ?? null, file?.originalName ?? null, file?.mimeType ?? null, file?.byteSize ?? null],
      );
    }
    await client.query('COMMIT');
    return { ...result.rows[0], oldStorageKey: current.rows[0] && file ? current.rows[0].attachmentKey : null };
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

export async function getLmsFile(user, type, fileId) {
  const tableAndKey = {
    material: ['learning_materials', 'id', 'attachment_key', 'attachment_name', 'attachment_mime'],
    assignment: ['assignments', 'id', 'attachment_key', 'attachment_name', 'attachment_mime'],
    submission: ['submissions', 'id', 'attachment_key', 'attachment_name', 'attachment_mime'],
  }[type];
  if (!tableAndKey) return null;
  if (type === 'material') {
    const material = await pool.query(
      `SELECT m.attachment_key AS "storageKey", m.attachment_name AS "originalName", m.attachment_mime AS "mediaType"
       FROM learning_materials m JOIN classes c ON c.id=m.class_id AND c.is_active=true
       JOIN class_memberships cm ON cm.class_id=m.class_id AND cm.user_id=$2
       WHERE m.id=$1 AND cm.membership_role=$3`, [fileId, user.id, user.role],
    );
    return material.rows[0] ?? null;
  }
  if (type === 'assignment') {
    const assignment = await pool.query(
      `SELECT a.attachment_key AS "storageKey", a.attachment_name AS "originalName", a.attachment_mime AS "mediaType"
       FROM assignments a JOIN classes c ON c.id=a.class_id AND c.is_active=true
       JOIN class_memberships cm ON cm.class_id=a.class_id AND cm.user_id=$2
       WHERE a.id=$1 AND cm.membership_role=$3`, [fileId, user.id, user.role],
    );
    return assignment.rows[0] ?? null;
  }
  const submission = await pool.query(
    `SELECT sub.attachment_key AS "storageKey", sub.attachment_name AS "originalName", sub.attachment_mime AS "mediaType"
     FROM submissions sub JOIN assignments a ON a.id=sub.assignment_id
     JOIN classes c ON c.id=a.class_id AND c.is_active=true
     WHERE sub.id=$1 AND ((sub.student_id=$2 AND EXISTS
       (SELECT 1 FROM class_memberships cm WHERE cm.class_id=a.class_id AND cm.user_id=$2 AND cm.membership_role='student')) OR EXISTS
       (SELECT 1 FROM class_memberships cm WHERE cm.class_id=a.class_id AND cm.user_id=$2 AND cm.membership_role='teacher'))`,
    [fileId, user.id],
  );
  return submission.rows[0] ?? null;
}
