# url-redirector

API de redirecionamento de URLs construída com Go + Fiber.

## Stack

- **Go 1.22** + **Fiber v2**
- **PostgreSQL** via `pgx/v5`
- **Docker** + **Traefik v3**

## Setup local

```bash
# 1. Dependências
go mod tidy

# 2. Variáveis de ambiente
cp .env.example .env
# edite .env com suas credenciais

# 3. Migration (rode contra o seu Postgres)
psql $DATABASE_URL -f migrations/001_init.sql

# 4. Rodar
go run ./cmd/main.go
```

## Deploy no VPS

```bash
# Copie o .env com as variáveis reais
cp .env.example .env

# Sobe via Compose (usa a rede externa traefik-net)
docker compose up -d --build
```

Observação: o `docker-compose.yml` espera que Traefik e Postgres já estejam na rede externa `traefik-net`.

## Endpoints

### Público

| Método | Rota     | Descrição                        |
|--------|----------|----------------------------------|
| GET    | `/:slug` | Redireciona para a URL de destino |

### Admin (header `X-API-Key: <sua_chave>`)

| Método | Rota               | Descrição            |
|--------|--------------------|----------------------|
| POST   | `/api/links`       | Cria um link         |
| GET    | `/api/links`       | Lista todos os links |
| DELETE | `/api/links/:slug` | Remove um link       |

### Exemplo de criação

```bash
curl -X POST https://r.seudominio.com/api/links \
  -H "Content-Type: application/json" \
  -H "X-API-Key: troca-isso-aqui" \
  -d '{"slug": "yt", "target_url": "https://youtube.com"}'
```
