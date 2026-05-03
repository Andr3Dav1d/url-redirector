import { Request, Response, NextFunction } from "express";
import * as repo from "../repository/link";

export function apiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.headers["x-api-key"] !== process.env.API_KEY) {
    res.status(401).json({ error: "chave inválida" });
    return;
  }
  next();
}

export async function redirect(req: Request, res: Response) {
  const link = await repo.getBySlug(req.params.slug);
  if (!link) {
    res.status(404).json({ error: "link não encontrado" });
    return;
  }
  repo.incrementClicks(req.params.slug).catch(console.error);
  res.redirect(301, link.target_url);
}

export async function createLink(req: Request, res: Response) {
  const { slug, target_url } = req.body;
  if (!slug || !target_url) {
    res.status(400).json({ error: "slug e target_url são obrigatórios" });
    return;
  }
  const link = await repo.create(slug, target_url);
  res.status(201).json(link);
}

export async function listLinks(_req: Request, res: Response) {
  const links = await repo.list();
  res.json(links);
}

export async function deleteLink(req: Request, res: Response) {
  await repo.remove(req.params.slug);
  res.sendStatus(204);
}
