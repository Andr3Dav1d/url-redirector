import sql from "../db";

export interface Link {
  id: number;
  slug: string;
  target_url: string;
  clicks: number;
  created_at: Date;
}

export interface LinkStats {
  total_links: number;
  total_clicks: number;
  active_links: number;
  top_links: Link[];
  recent_links: Link[];
}

export async function getBySlug(slug: string): Promise<Link | null> {
  const [link] = await sql<Link[]>`
    SELECT * FROM links WHERE slug = ${slug}
  `;
  return link ?? null;
}

export async function incrementClicks(slug: string): Promise<void> {
  await sql`UPDATE links SET clicks = clicks + 1 WHERE slug = ${slug}`;
}

export async function create(slug: string, target_url: string): Promise<Link> {
  const [link] = await sql<Link[]>`
    INSERT INTO links (slug, target_url)
    VALUES (${slug}, ${target_url})
    RETURNING *
  `;
  return link;
}

export async function list(): Promise<Link[]> {
  return sql<Link[]>`SELECT * FROM links ORDER BY created_at DESC`;
}

export async function stats(): Promise<LinkStats> {
  const [summary] = await sql<{
    total_links: number;
    total_clicks: number;
    active_links: number;
  }[]>`
    SELECT
      COUNT(*)::int AS total_links,
      COALESCE(SUM(clicks), 0)::int AS total_clicks,
      COUNT(*) FILTER (WHERE clicks > 0)::int AS active_links
    FROM links
  `;

  const topLinks = await sql<Link[]>`
    SELECT *
    FROM links
    ORDER BY clicks DESC, created_at DESC
    LIMIT 5
  `;

  const recentLinks = await sql<Link[]>`
    SELECT *
    FROM links
    ORDER BY created_at DESC
    LIMIT 5
  `;

  return {
    total_links: summary?.total_links ?? 0,
    total_clicks: summary?.total_clicks ?? 0,
    active_links: summary?.active_links ?? 0,
    top_links: topLinks,
    recent_links: recentLinks,
  };
}

export async function remove(slug: string): Promise<void> {
  await sql`DELETE FROM links WHERE slug = ${slug}`;
}
