CREATE TABLE IF NOT EXISTS releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  scheduled_at TIMESTAMPTZ NOT NULL,
  additional_info TEXT NOT NULL DEFAULT '',
  completed_steps BOOLEAN[] NOT NULL DEFAULT ARRAY[false, false, false, false, false, false, false, false],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (cardinality(completed_steps) = 8)
);
