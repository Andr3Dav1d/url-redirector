import { Request, Response, NextFunction } from "express";
import * as repo from "../repository/link";

const SLUG_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!process.env.API_KEY) {
    res.status(500).json({ error: "API_KEY não configurada" });
    return;
  }
  if (req.headers["x-api-key"] !== process.env.API_KEY) {
    res.status(401).json({ error: "Chave inválida" });
    return;
  }
  next();
}

export async function redirect(req: Request, res: Response) {
  const link = await repo.getBySlug(req.params.slug);
  if (!link) {
    res.status(404).json({ error: "Link não encontrado" });
    return;
  }
  repo.incrementClicks(req.params.slug).catch(console.error);
  res.redirect(301, link.target_url);
}

export async function createLink(req: Request, res: Response) {
  const slug = typeof req.body.slug === "string" ? req.body.slug.trim() : "";
  const targetUrl = typeof req.body.target_url === "string" ? req.body.target_url.trim() : "";

  if (!slug || !targetUrl) {
    res.status(400).json({ error: "Slug e target_url são obrigatórios" });
    return;
  }

  if (!SLUG_PATTERN.test(slug)) {
    res.status(400).json({ error: "Slug inválido. Use até 64 caracteres com letras, números, '_' ou '-'" });
    return;
  }

  if (!isValidHttpUrl(targetUrl)) {
    res.status(400).json({ error: "target_url inválida. Use uma URL http ou https completa" });
    return;
  }

  const link = await repo.create(slug, targetUrl);
  res.status(201).json(link);
}

export async function listLinks(_req: Request, res: Response) {
  const links = await repo.list();
  res.json(links);
}

export async function getStats(_req: Request, res: Response) {
  const stats = await repo.stats();
  res.json(stats);
}

export async function deleteLink(req: Request, res: Response) {
  await repo.remove(req.params.slug);
  res.sendStatus(204);
}
