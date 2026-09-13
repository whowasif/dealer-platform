import { safeQuery } from "./db";
import { INSIGHTS, NETWORK_GALLERY } from "./content";

// -----------------------------------------------------------------------------
// Server-side content loaders. Read editable cards from the shared database
// (managed by the admin app). If the DB is unconfigured, unreachable, or empty,
// fall back to the static content in lib/content.ts so the site never breaks.
// -----------------------------------------------------------------------------

export interface InsightItem {
  title: string;
  date: string;
  img: string;
  excerpt: string;
}

export interface NetworkItem {
  id: number;
  img: string;
  title: string;
  caption: string;
  color: string;
}

const STATIC_INSIGHTS: InsightItem[] = INSIGHTS.map((p) => ({
  title: p.title,
  date: p.date,
  img: p.img,
  excerpt: p.excerpt,
}));

const STATIC_NETWORK: NetworkItem[] = NETWORK_GALLERY.map((n) => ({
  id: n.id,
  img: n.img,
  title: n.title,
  caption: n.caption,
  color: n.color,
}));

export async function getInsights(): Promise<InsightItem[]> {
  const rows = await safeQuery<{
    title: string;
    date_label: string;
    image_url: string;
    excerpt: string;
  }>(
    `SELECT title, date_label, image_url, excerpt
       FROM website_insight_cards
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, created_at ASC`
  );
  if (rows.length === 0) return STATIC_INSIGHTS;
  return rows.map((r) => ({
    title: r.title,
    date: r.date_label,
    img: r.image_url,
    excerpt: r.excerpt,
  }));
}

export async function getNetworkGallery(): Promise<NetworkItem[]> {
  const rows = await safeQuery<{
    title: string;
    caption: string;
    image_url: string;
    accent_color: string;
    sort_order: number;
  }>(
    `SELECT title, caption, image_url, accent_color, sort_order
       FROM website_network_cards
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, created_at ASC`
  );
  if (rows.length === 0) return STATIC_NETWORK;
  return rows.map((r, i) => ({
    id: r.sort_order || i + 1,
    img: r.image_url,
    title: r.title,
    caption: r.caption,
    color: r.accent_color,
  }));
}
