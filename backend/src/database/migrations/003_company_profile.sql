ALTER TABLE school_profiles
  ADD COLUMN slug text UNIQUE,
  ADD COLUMN is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN media_asset_id uuid REFERENCES media_assets(id) ON DELETE SET NULL;

ALTER TABLE programs
  ADD COLUMN summary text,
  ADD COLUMN media_asset_id uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  ADD COLUMN display_order integer NOT NULL DEFAULT 0,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE news
  ADD COLUMN summary text,
  ADD COLUMN media_asset_id uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE events
  ADD COLUMN location text,
  ADD COLUMN is_published boolean NOT NULL DEFAULT false,
  ADD COLUMN media_asset_id uuid REFERENCES media_assets(id) ON DELETE SET NULL,
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE school_contacts (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  address text,
  phone text,
  email text,
  website_url text,
  map_url text,
  updated_by uuid REFERENCES users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX programs_public_order_idx ON programs(is_published, display_order, name);
CREATE INDEX events_public_starts_idx ON events(is_published, starts_at);
