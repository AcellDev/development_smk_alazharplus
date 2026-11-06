ALTER TABLE classes
  ADD COLUMN is_ppdb_enrollment_default boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX classes_one_ppdb_enrollment_default_per_program_idx
  ON classes(program_id)
  WHERE is_ppdb_enrollment_default=true AND program_id IS NOT NULL;
