import sql from "../db";

export interface Link {
  id: number;
  slug: string;
  target_url: string;
  clicks: number;
  created_at: Date;
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

export async function remove(slug: string): Promise<void> {
  await sql`DELETE FROM links WHERE slug = ${slug}`;
}
