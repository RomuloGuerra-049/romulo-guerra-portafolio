CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(80) NOT NULL,
  email varchar(254) NOT NULL,
  subject varchar(180) NOT NULL,
  message text NOT NULL,
  delivery_status varchar(30) NOT NULL DEFAULT 'pending',
  delivery_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz
);

CREATE INDEX IF NOT EXISTS contacts_created_at_idx
  ON contacts(created_at DESC);
