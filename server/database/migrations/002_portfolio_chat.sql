CREATE TABLE IF NOT EXISTS portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title varchar(120) NOT NULL,
  description text NOT NULL,
  technologies text[] NOT NULL DEFAULT '{}',
  demo_url text,
  repository_url text,
  image_data bytea,
  image_mime varchar(80),
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portfolio_items_published_idx
  ON portfolio_items(published, created_at DESC);

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id varchar(100) NOT NULL,
  sender varchar(20) NOT NULL,
  message text NOT NULL,
  language varchar(5) NOT NULL DEFAULT 'es',
  delivery_status varchar(30) NOT NULL DEFAULT 'local',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_idx
  ON chat_messages(session_id, created_at);
