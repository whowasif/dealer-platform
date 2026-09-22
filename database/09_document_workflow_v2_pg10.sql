-- PostgreSQL 10-compatible version of migration 09.
-- Run after 08_website_content_pg10.sql.
-- Uses public.gen_uuid_v4() from 01_schema_pg10.sql; no extensions required.

BEGIN;

CREATE TABLE IF NOT EXISTS personal_documents (
    id              UUID PRIMARY KEY DEFAULT public.gen_uuid_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type   VARCHAR(60) NOT NULL,
    title           VARCHAR(200) NOT NULL,
    file_url        TEXT NOT NULL,
    file_size       BIGINT,
    mime_type       VARCHAR(150),
    notes           TEXT,
    uploaded_by     UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_personal_documents_user
    ON personal_documents(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS work_file_categories (
    id              UUID PRIMARY KEY DEFAULT public.gen_uuid_v4(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO work_file_categories (name, description)
VALUES
    ('quotation', 'Commercial quotation or price offer'),
    ('specification', 'Technical specification or scope'),
    ('other', 'Other project-related attachment')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS project_files (
    id              UUID PRIMARY KEY DEFAULT public.gen_uuid_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    category_id     UUID NOT NULL REFERENCES work_file_categories(id) ON DELETE RESTRICT,
    title           VARCHAR(200) NOT NULL,
    file_url        TEXT,
    file_size       BIGINT,
    mime_type       VARCHAR(150),
    content_text    TEXT,
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    recipient_id    UUID REFERENCES users(id) ON DELETE RESTRICT,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT project_files_has_content CHECK (file_url IS NOT NULL OR content_text IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_project_files_project
    ON project_files(project_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_project_files_recipient
    ON project_files(recipient_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS project_messages (
    id                UUID PRIMARY KEY DEFAULT public.gen_uuid_v4(),
    project_id        UUID REFERENCES projects(id) ON DELETE CASCADE,
    conversation_type VARCHAR(20) NOT NULL DEFAULT 'project',
    sender_id         UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    recipient_id      UUID REFERENCES users(id) ON DELETE RESTRICT,
    body              TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at           TIMESTAMPTZ,
    CONSTRAINT project_messages_type CHECK (conversation_type IN ('project', 'support')),
    CONSTRAINT project_messages_target CHECK (
        (conversation_type = 'project' AND project_id IS NOT NULL)
        OR (conversation_type = 'support' AND project_id IS NULL)
    )
);
CREATE INDEX IF NOT EXISTS idx_project_messages_project
    ON project_messages(project_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_project_messages_sender_recipient
    ON project_messages(sender_id, recipient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS project_progress_stages (
    id              UUID PRIMARY KEY DEFAULT public.gen_uuid_v4(),
    stage_key       VARCHAR(50) NOT NULL UNIQUE,
    display_name    VARCHAR(100) NOT NULL,
    sort_order      INTEGER NOT NULL UNIQUE,
    is_terminal     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO project_progress_stages
    (stage_key, display_name, sort_order, is_terminal)
VALUES
    ('draft', 'Draft', 10, FALSE),
    ('quotation', 'Quotation / proposal', 20, FALSE),
    ('specification', 'Specification review', 30, FALSE),
    ('approved', 'Approved', 40, FALSE),
    ('procurement', 'Procurement', 50, FALSE),
    ('implementation', 'Implementation', 60, FALSE),
    ('testing', 'Testing / handover', 70, FALSE),
    ('closed', 'Closed', 80, TRUE),
    ('cancelled', 'Cancelled', 90, TRUE)
ON CONFLICT (stage_key) DO NOTHING;

ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS progress_stage_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_progress_stage_fk') THEN
        ALTER TABLE projects
            ADD CONSTRAINT projects_progress_stage_fk
            FOREIGN KEY (progress_stage_id) REFERENCES project_progress_stages(id);
    END IF;
END $$;

UPDATE projects
   SET progress_stage_id = (
       SELECT id FROM project_progress_stages
        WHERE stage_key = CASE
            WHEN projects.status = 'cancelled' THEN 'cancelled'
            WHEN projects.status IN ('completed', 'profit_distributed') THEN 'closed'
            WHEN projects.status = 'in_progress' THEN 'implementation'
            ELSE 'draft'
        END
   )
 WHERE progress_stage_id IS NULL;

CREATE TABLE IF NOT EXISTS project_progress_history (
    id              UUID PRIMARY KEY DEFAULT public.gen_uuid_v4(),
    project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    from_stage_id   UUID REFERENCES project_progress_stages(id),
    to_stage_id     UUID NOT NULL REFERENCES project_progress_stages(id),
    changed_by      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    note            TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_project_progress_history_project
    ON project_progress_history(project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS project_progress_permissions (
    id              UUID PRIMARY KEY DEFAULT public.gen_uuid_v4(),
    stage_id        UUID NOT NULL REFERENCES project_progress_stages(id) ON DELETE CASCADE,
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    can_transition  BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE(stage_id, role_id)
);

INSERT INTO project_progress_permissions(stage_id, role_id)
SELECT s.id, r.id FROM project_progress_stages s CROSS JOIN roles r
WHERE r.name IN ('super_admin', 'hq_admin', 'hq_operations', 'hq_finance')
ON CONFLICT (stage_id, role_id) DO NOTHING;

INSERT INTO project_progress_permissions(stage_id, role_id)
SELECT s.id, r.id FROM project_progress_stages s CROSS JOIN roles r
WHERE r.name = 'divisional_head'
  AND s.stage_key IN ('approved', 'testing', 'closed', 'cancelled')
ON CONFLICT (stage_id, role_id) DO NOTHING;

INSERT INTO project_progress_permissions(stage_id, role_id)
SELECT s.id, r.id FROM project_progress_stages s CROSS JOIN roles r
WHERE r.name = 'district_head'
  AND s.stage_key IN ('specification', 'approved', 'testing', 'closed', 'cancelled')
ON CONFLICT (stage_id, role_id) DO NOTHING;

INSERT INTO project_progress_permissions(stage_id, role_id)
SELECT s.id, r.id FROM project_progress_stages s CROSS JOIN roles r
WHERE r.name = 'upazila_representative'
  AND s.stage_key IN ('quotation', 'specification', 'procurement', 'implementation', 'testing')
ON CONFLICT (stage_id, role_id) DO NOTHING;

COMMIT;
