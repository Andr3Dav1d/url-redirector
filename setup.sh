#!/bin/bash
set -e

PROJECT="url-redirector"
mkdir -p $PROJECT/{src/{handler,repository,db},migrations}
cd $PROJECT

# package.json
cat > package.json << 'EOF'
{
  "name": "url-redirector",
  "version": "1.0.0",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.19.2",
    "postgres": "^3.4.4",
    "dotenv": "^16.4.5"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "typescript": "^5.4.5",
    "tsx": "^4.11.0"
  }
}
EOF

# tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "rootDir": "src",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
EOF

# .env.example
cat > .env.example << 'EOF'
DATABASE_URL=postgresql://postgres.xxxx:SENHA@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
API_KEY=troca-isso-aqui
PORT=3000
DOMAIN=r.seudominio.com
EOF

# .gitignore
cat > .gitignore << 'EOF'
# Env
.env

# Build
dist/

# Deps
node_modules/

# IDEs
.idea/
.vscode/

# OS
.DS_Store
Thumbs.db
EOF

# migration
cat > migrations/001_init.sql << 'EOF'
CREATE TABLE IF NOT EXISTS links (
    id         SERIAL PRIMARY KEY,
    slug       TEXT NOT NULL UNIQUE,
    target_url TEXT NOT NULL,
    clicks     INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_links_slug ON links(slug);
EOF

# db
cat > src/db/index.ts << 'EOF'
import postgres from "postgres";
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL não definida");
}

const sql = postgres(process.env.DATABASE_URL, { ssl: "require" });

export default sql;
EOF

# repository
cat > src/repository/link.ts << 'EOF'
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
EOF

# handlers
cat > src/handler/redirect.ts << 'EOF'
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
EOF

# entrypoint
cat > src/index.ts << 'EOF'
import "dotenv/config";
import express from "express";
import * as h from "./handler/redirect";

const app = express();
app.use(express.json());

// Público
app.get("/:slug", h.redirect);

// Admin
const api = express.Router();
api.use(h.apiKeyMiddleware);
api.post("/links", h.createLink);
api.get("/links", h.listLinks);
api.delete("/links/:slug", h.deleteLink);
app.use("/api", api);

const port = process.env.PORT ?? 3000;
app.listen(port, () => console.log(`rodando na porta ${port}`));
EOF

# Dockerfile
cat > Dockerfile << 'EOF'
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/index.js"]
EOF

# docker-compose
cat > docker-compose.yml << 'EOF'
services:
  redirector:
    build: .
    restart: unless-stopped
    env_file: .env
    networks:
      - proxy
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.redirector.rule=Host(`${DOMAIN}`)"
      - "traefik.http.routers.redirector.entrypoints=websecure"
      - "traefik.http.routers.redirector.tls.certresolver=letsencrypt"
      - "traefik.http.services.redirector.loadbalancer.server.port=3000"

networks:
  proxy:
    external: true
EOF

echo ""
echo "✅ Projeto criado em ./$PROJECT"
echo ""
echo "Próximos passos:"
echo "  cd $PROJECT"
echo "  cp .env.example .env   # preencha com suas credenciais"
echo "  npm install"
echo "  npm run dev"
