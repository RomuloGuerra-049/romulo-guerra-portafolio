-- Modelo de referencia PostgreSQL. No se ejecuta automáticamente.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('admin', 'client', 'collaborator');
CREATE TYPE user_status AS ENUM ('active', 'pending', 'suspended');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(80) NOT NULL,
  email varchar(254) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'client',
  status user_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE contacts (
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
CREATE INDEX contacts_created_at_idx ON contacts(created_at DESC);

CREATE TABLE portfolio_items (
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
CREATE INDEX portfolio_items_published_idx
  ON portfolio_items(published, created_at DESC);

CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id varchar(100) NOT NULL,
  sender varchar(20) NOT NULL,
  message text NOT NULL,
  language varchar(5) NOT NULL DEFAULT 'es',
  delivery_status varchar(30) NOT NULL DEFAULT 'local',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_session_idx
  ON chat_messages(session_id, created_at);

CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name varchar(120) NOT NULL,
  description text NOT NULL,
  objective text,
  service_type varchar(100) NOT NULL,
  status varchar(60) NOT NULL,
  progress smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  priority varchar(20) NOT NULL DEFAULT 'Media',
  start_date date,
  estimated_delivery date,
  completed_at timestamptz,
  budget numeric(14,2) NOT NULL DEFAULT 0 CHECK (budget >= 0),
  preview_url text,
  production_url text,
  client_notes text,
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_client_id_idx ON projects(client_id);
CREATE INDEX projects_status_idx ON projects(status);

CREATE TABLE project_members (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_role varchar(40) NOT NULL DEFAULT 'collaborator',
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE project_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name varchar(80) NOT NULL,
  status varchar(40) NOT NULL,
  progress smallint NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  estimated_date date,
  completed_at timestamptz,
  assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  client_comment text,
  internal_comment text,
  position smallint NOT NULL DEFAULT 0
);
CREATE INDEX project_stages_project_id_idx ON project_stages(project_id);

CREATE TABLE project_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  name varchar(120) NOT NULL,
  company varchar(120),
  description text NOT NULL,
  objective text NOT NULL,
  target_audience text,
  project_type varchar(100) NOT NULL,
  required_features text,
  approximate_budget varchar(80),
  desired_date date,
  visual_references text,
  comments text,
  status varchar(50) NOT NULL DEFAULT 'Pendiente de evaluación',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX project_requests_client_id_idx ON project_requests(client_id);

CREATE TABLE change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  title varchar(150) NOT NULL,
  description text NOT NULL,
  affected_section varchar(150),
  request_type varchar(100) NOT NULL,
  priority varchar(20) NOT NULL,
  desired_date date,
  status varchar(50) NOT NULL DEFAULT 'Recibida',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX change_requests_project_id_idx ON change_requests(project_id);

CREATE TABLE proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  project_request_id uuid REFERENCES project_requests(id) ON DELETE SET NULL,
  title varchar(160) NOT NULL,
  description text NOT NULL,
  scope text NOT NULL,
  exclusions text,
  price numeric(14,2) NOT NULL CHECK (price >= 0),
  currency char(3) NOT NULL DEFAULT 'COP',
  estimated_time varchar(100),
  payment_terms text,
  conditions text,
  issued_at date,
  expires_at date,
  status varchar(40) NOT NULL DEFAULT 'Borrador',
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX proposals_client_id_idx ON proposals(client_id);

CREATE TABLE proposal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  position smallint NOT NULL DEFAULT 0
);

CREATE TABLE approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title varchar(160) NOT NULL,
  description text NOT NULL,
  approval_type varchar(60) NOT NULL,
  resource_url text,
  version varchar(30),
  status varchar(40) NOT NULL DEFAULT 'Pendiente',
  requested_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  responded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  comments text
);

CREATE TABLE files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  original_name text NOT NULL,
  storage_name text NOT NULL UNIQUE,
  storage_location text NOT NULL,
  mime_type varchar(160) NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  category varchar(60) NOT NULL,
  version varchar(30),
  description text,
  visibility varchar(30) NOT NULL DEFAULT 'private',
  status varchar(30) NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX files_project_id_idx ON files(project_id);

CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL,
  attachment_id uuid REFERENCES files(id) ON DELETE SET NULL,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_conversation_created_idx ON messages(conversation_id, created_at);

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  title varchar(160) NOT NULL,
  description text,
  status varchar(40) NOT NULL DEFAULT 'Pendiente',
  priority varchar(20) NOT NULL DEFAULT 'Media',
  starts_on date,
  due_on date,
  completed_at timestamptz,
  visibility varchar(20) NOT NULL DEFAULT 'internal',
  comments text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX tasks_project_id_idx ON tasks(project_id);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE RESTRICT,
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  concept varchar(160) NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency char(3) NOT NULL DEFAULT 'COP',
  method varchar(60),
  expected_on date,
  paid_at timestamptz,
  status varchar(40) NOT NULL DEFAULT 'Pendiente',
  reference varchar(120),
  receipt_file_id uuid REFERENCES files(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_project_client_idx ON payments(project_id, client_id);

CREATE TABLE support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  subject varchar(180) NOT NULL,
  description text NOT NULL,
  category varchar(50) NOT NULL,
  priority varchar(20) NOT NULL DEFAULT 'Media',
  status varchar(40) NOT NULL DEFAULT 'Abierto',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  content text NOT NULL,
  file_id uuid REFERENCES files(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type varchar(80) NOT NULL,
  title varchar(160) NOT NULL,
  message text NOT NULL,
  related_url text,
  resource_id uuid,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_read_idx ON notifications(user_id, read_at);

CREATE TABLE activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action varchar(100) NOT NULL,
  resource varchar(80) NOT NULL,
  resource_id uuid,
  description text NOT NULL,
  safe_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_logs_created_at_idx ON activity_logs(created_at DESC);
