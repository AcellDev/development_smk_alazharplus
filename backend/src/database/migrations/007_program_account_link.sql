ALTER TABLE applicants
  ADD COLUMN program_id uuid REFERENCES programs(id) ON DELETE SET NULL;

ALTER TABLE classes
  ADD COLUMN program_id uuid REFERENCES programs(id) ON DELETE SET NULL;

CREATE INDEX applicants_program_status_idx ON applicants(program_id, status);
CREATE INDEX classes_program_year_active_idx ON classes(program_id, academic_year, is_active);
