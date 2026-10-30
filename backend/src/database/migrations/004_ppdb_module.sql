CREATE SEQUENCE ppdb_registration_number_seq START WITH 1 INCREMENT BY 1 NO CYCLE;

ALTER TABLE applicants
  ADD COLUMN phone text,
  ADD COLUMN address text;

ALTER TABLE ppdb_periods
  ADD COLUMN is_published boolean NOT NULL DEFAULT false;

CREATE TABLE ppdb_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES ppdb_periods(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_required boolean NOT NULL DEFAULT false,
  allowed_mime_types text[] NOT NULL DEFAULT ARRAY['application/pdf','image/jpeg','image/png','image/webp']::text[],
  max_bytes bigint NOT NULL DEFAULT 5242880 CHECK (max_bytes > 0 AND max_bytes <= 10485760),
  display_order integer NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_id, name)
);

CREATE TABLE ppdb_schedule_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id uuid NOT NULL REFERENCES ppdb_periods(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  display_order integer NOT NULL DEFAULT 0 CHECK (display_order >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (starts_at IS NULL OR ends_at IS NULL OR ends_at >= starts_at)
);

ALTER TABLE application_documents
  ADD COLUMN requirement_id uuid REFERENCES ppdb_requirements(id) ON DELETE RESTRICT,
  ADD COLUMN is_current boolean NOT NULL DEFAULT true;

CREATE INDEX ppdb_requirements_period_order_idx ON ppdb_requirements(period_id, display_order, name);
CREATE INDEX ppdb_schedule_period_order_idx ON ppdb_schedule_items(period_id, display_order, starts_at);
CREATE INDEX application_documents_current_idx ON application_documents(applicant_id, requirement_id) WHERE is_current = true;
CREATE INDEX ppdb_applicant_user_idx ON applicants(user_id);
