CREATE TABLE galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(180) NOT NULL,
  category varchar(80) NOT NULL,
  description text NOT NULL,
  image_url text NOT NULL DEFAULT '',
  activity_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, title)
);

CREATE INDEX galleries_category_date_idx ON galleries(category, activity_date DESC NULLS LAST, created_at DESC);
