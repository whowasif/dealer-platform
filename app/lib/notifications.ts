import "server-only";
import type { PoolClient } from "pg";
import { pool, query, queryOne } from "./db";
import type { SessionUser } from "./types";

// -----------------------------------------------------------------------------
// Notifications — a simple per-user inbox. No websockets; the UI re-renders on
// navigation. Creation can enlist in an existing transaction (pass the client)
// so a notification commits atomically with the event that triggered it (e.g. a
// disciplinary action), or run on the shared pool when no transaction is active.
// -----------------------------------------------------------------------------

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  action_url: string | null;
  read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NewNotification {
  title: string;
  message: string;
  /** Free-form category: 'disciplinary' | 'complaint' | 'system' | ... */
  type: string;
  actionUrl?: string | null;
}

/**
 * Create a notification for a user. Pass a PoolClient to enlist in a
 * transaction; omit it to use the shared pool. Returns the new row id.
 */
export async function createNotification(
  userId: string,
  input: NewNotification,
  client?: PoolClient | null
): Promise<string> {
  const runner = client ?? pool;
  const res = await runner.query<{ id: string }>(
    `INSERT INTO notifications (user_id, title, message, type, action_url)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id`,
    [userId, input.title, input.message, input.type, input.actionUrl ?? null]
  );
  return res.rows[0]!.id;
}

/** The current user's notifications, newest first (capped at 100). */
export async function listNotifications(
  user: SessionUser
): Promise<NotificationRow[]> {
  return query<NotificationRow>(
    `SELECT id, user_id, title, message, type, action_url, read, read_at,
            created_at
       FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100`,
    [user.id]
  );
}

/** How many unread notifications the current user has. */
export async function unreadCount(user: SessionUser): Promise<number> {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM notifications
      WHERE user_id = $1 AND read = FALSE`,
    [user.id]
  );
  return row ? Number(row.count) : 0;
}

/** Mark one notification read — only if it belongs to the current user. */
export async function markRead(id: string, user: SessionUser): Promise<void> {
  await query(
    `UPDATE notifications
        SET read = TRUE, read_at = NOW()
      WHERE id = $1 AND user_id = $2 AND read = FALSE`,
    [id, user.id]
  );
}

/** Mark all of the current user's notifications read. */
export async function markAllRead(user: SessionUser): Promise<number> {
  const rows = await query<{ id: string }>(
    `UPDATE notifications
        SET read = TRUE, read_at = NOW()
      WHERE user_id = $1 AND read = FALSE
      RETURNING id`,
    [user.id]
  );
  return rows.length;
}
