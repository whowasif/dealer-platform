import "server-only";
import { query, queryOne, withTransaction } from "./db";
import { isHQ } from "./rbac";
import { canViewProject, getProject } from "./projects";
import type {
  ProjectFileRow,
  ProjectMessageRow,
  ProjectParticipant,
  ProjectProgressRow,
  ProjectProgressStageRow,
  SessionUser,
  WorkFileCategoryRow,
} from "./types";

export async function listWorkFileCategories(): Promise<WorkFileCategoryRow[]> {
  return query<WorkFileCategoryRow>(
    `SELECT id, name, description, is_active
       FROM work_file_categories
      WHERE is_active = TRUE
      ORDER BY name ASC`
  );
}

export async function listProjectFiles(
  projectId: string,
  actor: SessionUser
): Promise<ProjectFileRow[]> {
  const project = await getProject(projectId);
  if (!project || !canViewProject(actor, project)) {
    throw new Error("You are not authorized to view this project.");
  }
  return query<ProjectFileRow>(
    `SELECT f.id, f.project_id, f.category_id, c.name AS category_name,
            f.title, f.file_url, f.file_size, f.mime_type, f.content_text,
            f.sender_id, su.full_name AS sender_name,
            f.recipient_id, ru.full_name AS recipient_name,
            f.sent_at, f.updated_at
       FROM project_files f
       JOIN work_file_categories c ON c.id = f.category_id
       JOIN users su ON su.id = f.sender_id
       LEFT JOIN users ru ON ru.id = f.recipient_id
      WHERE f.project_id = $1
      ORDER BY f.sent_at DESC`,
    [projectId]
  );
}

export async function listProjectParticipants(
  projectId: string,
  actor: SessionUser
): Promise<ProjectParticipant[]> {
  const project = await getProject(projectId);
  if (!project || !canViewProject(actor, project)) {
    throw new Error("You are not authorized to view this project.");
  }
  return query<ProjectParticipant>(
    `SELECT DISTINCT u.id, u.full_name, r.name AS role_name
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
      WHERE u.id IN (
        SELECT rep.user_id FROM representatives rep WHERE rep.id = $1
        UNION
        SELECT dh.user_id
          FROM representatives dh
          JOIN upazilas dup ON dup.id = dh.upazila_id
         WHERE dup.district_id = $2 AND dup.is_sadar = TRUE
        UNION
        SELECT dv.head_user_id
          FROM divisions dv
         WHERE dv.id = $3 AND dv.head_user_id IS NOT NULL
        UNION
        SELECT ur2.user_id
          FROM user_roles ur2
          JOIN roles r2 ON r2.id = ur2.role_id
         WHERE r2.name IN ('super_admin','hq_admin','hq_finance','hq_operations')
      )
      ORDER BY u.full_name ASC`,
    [project.representative_id, project.district_id, project.division_id]
  );
}

async function assertParticipant(projectId: string, userId: string, actor: SessionUser) {
  const participants = await listProjectParticipants(projectId, actor);
  if (!participants.some((p) => p.id === userId)) {
    throw new Error("That person is not related to this project.");
  }
}

export interface CreateProjectFileInput {
  projectId: string;
  categoryId: string;
  title: string;
  contentText: string | null;
  storageKey: string | null;
  fileSize: number | null;
  mimeType: string | null;
  recipientId: string | null;
}

export async function createProjectFile(
  input: CreateProjectFileInput,
  actor: SessionUser
): Promise<string> {
  await assertParticipant(input.projectId, actor.id, actor);
  if (input.recipientId) await assertParticipant(input.projectId, input.recipientId, actor);
  if (!input.contentText && !input.storageKey) throw new Error("Add text or a file.");
  const row = await queryOne<{ id: string }>(
    `INSERT INTO project_files
        (project_id, category_id, title, file_url, file_size, mime_type,
         content_text, sender_id, recipient_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING id`,
    [input.projectId, input.categoryId, input.title, input.storageKey, input.fileSize, input.mimeType, input.contentText, actor.id, input.recipientId]
  );
  if (!row) throw new Error("Could not save the project file.");
  return row.id;
}

export async function updateProjectFile(
  id: string,
  title: string,
  contentText: string,
  actor: SessionUser
): Promise<void> {
  if (!isHQ(actor)) {
    const owner = await queryOne<{ sender_id: string }>(
      `SELECT sender_id FROM project_files WHERE id = $1`,
      [id]
    );
    if (!owner || owner.sender_id !== actor.id) {
      throw new Error("Only the sender or HQ/admin can edit this file.");
    }
  }
  await query(
    `UPDATE project_files SET title = $1, content_text = $2, updated_at = NOW() WHERE id = $3`,
    [title, contentText, id]
  );
}

export async function listProjectMessages(
  projectId: string,
  actor: SessionUser
): Promise<ProjectMessageRow[]> {
  await assertParticipant(projectId, actor.id, actor);
  return query<ProjectMessageRow>(
    `SELECT m.id, m.project_id, m.conversation_type, m.sender_id,
            su.full_name AS sender_name, m.recipient_id,
            ru.full_name AS recipient_name, m.body, m.created_at, m.read_at
       FROM project_messages m
       JOIN users su ON su.id = m.sender_id
       LEFT JOIN users ru ON ru.id = m.recipient_id
      WHERE m.project_id = $1
        AND (m.recipient_id IS NULL OR m.recipient_id = $2 OR m.sender_id = $2 OR $3 = TRUE)
      ORDER BY m.created_at ASC`,
    [projectId, actor.id, isHQ(actor)]
  );
}

export async function sendProjectMessage(
  projectId: string,
  recipientId: string | null,
  body: string,
  actor: SessionUser
): Promise<void> {
  await assertParticipant(projectId, actor.id, actor);
  if (recipientId) await assertParticipant(projectId, recipientId, actor);
  if (!body.trim()) throw new Error("Message cannot be empty.");
  await query(
    `INSERT INTO project_messages(project_id, conversation_type, sender_id, recipient_id, body)
     VALUES ($1,'project',$2,$3,$4)`,
    [projectId, actor.id, recipientId, body.trim()]
  );
}

export async function listProgressStages(): Promise<ProjectProgressStageRow[]> {
  return query<ProjectProgressStageRow>(
    `SELECT id, stage_key, display_name, sort_order, is_terminal, is_active
       FROM project_progress_stages WHERE is_active = TRUE ORDER BY sort_order`
  );
}

export async function getProjectProgress(
  projectId: string,
  actor: SessionUser
): Promise<ProjectProgressRow | null> {
  const project = await getProject(projectId);
  if (!project || !canViewProject(actor, project)) return null;
  return queryOne<ProjectProgressRow>(
    `SELECT p.id AS project_id, s.id AS stage_id, s.stage_key, s.display_name,
            h.id AS history_id, cu.full_name AS changed_by_name,
            h.created_at AS changed_at, h.note
       FROM projects p
       JOIN project_progress_stages s ON s.id = p.progress_stage_id
       LEFT JOIN LATERAL (
         SELECT * FROM project_progress_history ph
          WHERE ph.project_id = p.id ORDER BY ph.created_at DESC LIMIT 1
       ) h ON TRUE
       LEFT JOIN users cu ON cu.id = h.changed_by
      WHERE p.id = $1`,
    [projectId]
  );
}

export async function transitionProjectProgress(
  projectId: string,
  targetStageId: string,
  note: string | null,
  actor: SessionUser
): Promise<void> {
  const project = await getProject(projectId);
  if (!project || !canViewProject(actor, project)) {
    throw new Error("You are not authorized for this project.");
  }
  await withTransaction(async (client) => {
    const current = await client.query<{ progress_stage_id: string | null }>(
      `SELECT progress_stage_id FROM projects WHERE id = $1 FOR UPDATE`,
      [projectId]
    );
    const target = await client.query<{ sort_order: number }>(
      `SELECT sort_order FROM project_progress_stages WHERE id = $1 AND is_active = TRUE`,
      [targetStageId]
    );
    if (!current.rows[0]?.progress_stage_id || !target.rows[0]) throw new Error("Invalid progress stage.");
    if (current.rows[0].progress_stage_id === targetStageId) throw new Error("Project is already at that stage.");
    const permitted = await client.query(
      `SELECT 1
         FROM project_progress_permissions pp
         JOIN user_roles ur ON ur.role_id = pp.role_id AND ur.user_id = $1
        WHERE pp.stage_id = $2 AND pp.can_transition = TRUE
        LIMIT 1`,
      [actor.id, targetStageId]
    );
    if (permitted.rowCount === 0) throw new Error("Your role cannot move the project to that stage.");
    await client.query(`UPDATE projects SET progress_stage_id = $1, updated_at = NOW() WHERE id = $2`, [targetStageId, projectId]);
    await client.query(
      `INSERT INTO project_progress_history(project_id, from_stage_id, to_stage_id, changed_by, note)
       VALUES ($1,$2,$3,$4,$5)`,
      [projectId, current.rows[0].progress_stage_id, targetStageId, actor.id, note]
    );
  });
}

export async function getProjectFile(
  fileId: string,
  actor: SessionUser
): Promise<ProjectFileRow | null> {
  const row = await queryOne<ProjectFileRow>(
    `SELECT f.id, f.project_id, f.category_id, c.name AS category_name,
            f.title, f.file_url, f.file_size, f.mime_type, f.content_text,
            f.sender_id, su.full_name AS sender_name,
            f.recipient_id, ru.full_name AS recipient_name,
            f.sent_at, f.updated_at
       FROM project_files f
       JOIN work_file_categories c ON c.id = f.category_id
       JOIN users su ON su.id = f.sender_id
       LEFT JOIN users ru ON ru.id = f.recipient_id
      WHERE f.id = $1`,
    [fileId]
  );
  if (!row) return null;
  const project = await getProject(row.project_id);
  if (!project || !canViewProject(actor, project)) throw new Error("You are not authorized to view this file.");
  return row;
}

export async function createWorkFileCategory(
  name: string,
  description: string | null,
  actor: SessionUser
): Promise<void> {
  if (!isHQ(actor)) throw new Error("Only HQ/admin can add file categories.");
  if (!name.trim()) throw new Error("Category name is required.");
  await query(
    `INSERT INTO work_file_categories(name, description) VALUES ($1,$2)`,
    [name.trim().toLowerCase().replace(/\s+/g, "_"), description]
  );
}

export async function listHQParticipants(): Promise<ProjectParticipant[]> {
  return query<ProjectParticipant>(
    `SELECT DISTINCT u.id, u.full_name, r.name AS role_name
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
      WHERE r.name IN ('super_admin','hq_admin','hq_finance','hq_operations')
      ORDER BY u.full_name ASC`
  );
}

export async function listSupportMessages(actor: SessionUser): Promise<ProjectMessageRow[]> {
  return query<ProjectMessageRow>(
    `SELECT m.id, m.project_id, m.conversation_type, m.sender_id,
            su.full_name AS sender_name, m.recipient_id,
            ru.full_name AS recipient_name, m.body, m.created_at, m.read_at
       FROM project_messages m
       JOIN users su ON su.id = m.sender_id
       LEFT JOIN users ru ON ru.id = m.recipient_id
      WHERE m.conversation_type = 'support'
        AND ($1 = TRUE OR m.sender_id = $2 OR m.recipient_id = $2)
      ORDER BY m.created_at ASC`,
    [isHQ(actor), actor.id]
  );
}

export async function sendSupportMessage(
  recipientId: string,
  body: string,
  actor: SessionUser
): Promise<void> {
  if (isHQ(actor)) throw new Error("HQ should reply to an existing support conversation.");
  const hq = await listHQParticipants();
  if (!hq.some((person) => person.id === recipientId)) throw new Error("Choose an admin/HQ recipient.");
  if (!body.trim()) throw new Error("Message cannot be empty.");
  await query(
    `INSERT INTO project_messages(conversation_type, sender_id, recipient_id, body)
     VALUES ('support',$1,$2,$3)`,
    [actor.id, recipientId, body.trim()]
  );
}

export async function replyToSupportMessage(
  recipientId: string,
  body: string,
  actor: SessionUser
): Promise<void> {
  if (!isHQ(actor)) throw new Error("Only HQ/admin can reply as support.");
  if (!body.trim()) throw new Error("Message cannot be empty.");
  await query(
    `INSERT INTO project_messages(conversation_type, sender_id, recipient_id, body)
     VALUES ('support',$1,$2,$3)`,
    [actor.id, recipientId, body.trim()]
  );
}