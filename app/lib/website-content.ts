import "server-only";
import { query, queryOne } from "./db";

// -----------------------------------------------------------------------------
// Website content management (super-admin only — enforced in the pages/actions).
//
// Backs three tables created in database/08_website_content.sql:
//   * website_insight_cards    — "Insights & Opportunity" cards
//   * website_network_cards    — horizontal "Our Network" filmstrip cards
//   * website_contact_messages — contact-form inbox
//
// The public website (separate Next app) reads the two card tables directly;
// this module is the management-app side (list/create/update/delete + inbox).
// -----------------------------------------------------------------------------

export interface InsightCardRow {
  id: string;
  title: string;
  date_label: string;
  image_url: string;
  excerpt: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface NetworkCardRow {
  id: string;
  title: string;
  caption: string;
  image_url: string;
  accent_color: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
}

export interface ContactMessageRow {
  id: string;
  full_name: string;
  business_name: string | null;
  email: string;
  mobile: string;
  details: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  read_by: string | null;
}

// ============================ Insight cards ==================================

export async function listInsightCards(): Promise<InsightCardRow[]> {
  return query<InsightCardRow>(
    `SELECT id, title, date_label, image_url, excerpt, sort_order, is_active,
            created_at, updated_at, updated_by
       FROM website_insight_cards
      ORDER BY sort_order ASC, created_at ASC`
  );
}

export interface InsightCardInput {
  title: string;
  date_label: string;
  image_url: string;
  excerpt: string;
  sort_order: number;
  is_active: boolean;
}

export async function createInsightCard(
  input: InsightCardInput,
  actorId: string
): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO website_insight_cards
        (title, date_label, image_url, excerpt, sort_order, is_active, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id`,
    [
      input.title,
      input.date_label,
      input.image_url,
      input.excerpt,
      input.sort_order,
      input.is_active,
      actorId,
    ]
  );
  return row!.id;
}

export async function updateInsightCard(
  id: string,
  input: InsightCardInput,
  actorId: string
): Promise<void> {
  await query(
    `UPDATE website_insight_cards
        SET title = $2, date_label = $3, image_url = $4, excerpt = $5,
            sort_order = $6, is_active = $7, updated_at = NOW(), updated_by = $8
      WHERE id = $1`,
    [
      id,
      input.title,
      input.date_label,
      input.image_url,
      input.excerpt,
      input.sort_order,
      input.is_active,
      actorId,
    ]
  );
}

export async function deleteInsightCard(id: string): Promise<void> {
  await query(`DELETE FROM website_insight_cards WHERE id = $1`, [id]);
}

// ============================ Network cards ==================================

export async function listNetworkCards(): Promise<NetworkCardRow[]> {
  return query<NetworkCardRow>(
    `SELECT id, title, caption, image_url, accent_color, sort_order, is_active,
            created_at, updated_at, updated_by
       FROM website_network_cards
      ORDER BY sort_order ASC, created_at ASC`
  );
}

export interface NetworkCardInput {
  title: string;
  caption: string;
  image_url: string;
  accent_color: string;
  sort_order: number;
  is_active: boolean;
}

export async function createNetworkCard(
  input: NetworkCardInput,
  actorId: string
): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO website_network_cards
        (title, caption, image_url, accent_color, sort_order, is_active, updated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id`,
    [
      input.title,
      input.caption,
      input.image_url,
      input.accent_color,
      input.sort_order,
      input.is_active,
      actorId,
    ]
  );
  return row!.id;
}

export async function updateNetworkCard(
  id: string,
  input: NetworkCardInput,
  actorId: string
): Promise<void> {
  await query(
    `UPDATE website_network_cards
        SET title = $2, caption = $3, image_url = $4, accent_color = $5,
            sort_order = $6, is_active = $7, updated_at = NOW(), updated_by = $8
      WHERE id = $1`,
    [
      id,
      input.title,
      input.caption,
      input.image_url,
      input.accent_color,
      input.sort_order,
      input.is_active,
      actorId,
    ]
  );
}

export async function deleteNetworkCard(id: string): Promise<void> {
  await query(`DELETE FROM website_network_cards WHERE id = $1`, [id]);
}

// ========================== Contact messages ================================

export async function listContactMessages(
  filter: "all" | "unread" = "all"
): Promise<ContactMessageRow[]> {
  const where = filter === "unread" ? "WHERE is_read = FALSE" : "";
  return query<ContactMessageRow>(
    `SELECT id, full_name, business_name, email, mobile, details, is_read,
            created_at, read_at, read_by
       FROM website_contact_messages
       ${where}
      ORDER BY created_at DESC`
  );
}

export async function countUnreadContactMessages(): Promise<number> {
  const row = await queryOne<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM website_contact_messages WHERE is_read = FALSE`
  );
  return Number(row?.n ?? 0);
}

export async function getContactMessage(
  id: string
): Promise<ContactMessageRow | null> {
  return queryOne<ContactMessageRow>(
    `SELECT id, full_name, business_name, email, mobile, details, is_read,
            created_at, read_at, read_by
       FROM website_contact_messages
      WHERE id = $1`,
    [id]
  );
}

export async function setContactMessageRead(
  id: string,
  isRead: boolean,
  actorId: string
): Promise<void> {
  if (isRead) {
    await query(
      `UPDATE website_contact_messages
          SET is_read = TRUE, read_at = NOW(), read_by = $2
        WHERE id = $1`,
      [id, actorId]
    );
  } else {
    await query(
      `UPDATE website_contact_messages
          SET is_read = FALSE, read_at = NULL, read_by = NULL
        WHERE id = $1`,
      [id]
    );
  }
}

export async function deleteContactMessage(id: string): Promise<void> {
  await query(`DELETE FROM website_contact_messages WHERE id = $1`, [id]);
}
