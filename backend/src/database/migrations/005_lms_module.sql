ALTER TABLE classes
  ADD COLUMN description text,
  ADD COLUMN is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN created_by uuid REFERENCES users(id);

CREATE TABLE class_subjects (
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (class_id, subject_id)
);

ALTER TABLE learning_materials
  ADD COLUMN attachment_key text,
  ADD COLUMN attachment_name text,
  ADD COLUMN attachment_mime text,
  ADD COLUMN attachment_bytes bigint CHECK (attachment_bytes IS NULL OR attachment_bytes >= 0),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE assignments
  ADD COLUMN attachment_name text,
  ADD COLUMN attachment_mime text,
  ADD COLUMN attachment_bytes bigint CHECK (attachment_bytes IS NULL OR attachment_bytes >= 0),
  ADD COLUMN allow_resubmission boolean NOT NULL DEFAULT false,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE submissions
  ADD COLUMN attachment_name text,
  ADD COLUMN attachment_mime text,
  ADD COLUMN attachment_bytes bigint CHECK (attachment_bytes IS NULL OR attachment_bytes >= 0),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX class_subjects_subject_idx ON class_subjects(subject_id, class_id);
CREATE INDEX class_memberships_role_class_idx ON class_memberships(membership_role, class_id, user_id);
CREATE INDEX assignments_subject_idx ON assignments(class_id, subject_id, due_at);
CREATE INDEX submissions_student_updated_idx ON submissions(student_id, updated_at DESC);
CREATE INDEX materials_subject_idx ON learning_materials(class_id, subject_id, created_at DESC);
