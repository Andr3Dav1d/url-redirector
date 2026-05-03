# url-redirector

API de encurtamento e redirecionamento de URLs construída com Node.js, Express e TypeScript. Usa PostgreSQL como banco e sobe via Docker com Traefik.

---

## Stack

- **Node.js 22** + **Express 4** + **TypeScript 5**
- **postgres.js** para conexão com PostgreSQL
- **Docker** + **Traefik v3** para deploy

---

## Estrutura

```
url-redirector/
├── src/
│   ├── db/index.ts           # conexão com o banco
│   ├── handler/redirect.ts   # handlers HTTP + middleware de API key
│   ├── repository/link.ts    # queries SQL
│   └── index.ts              # entrypoint
├── migrations/
│   └── 001_init.sql          # cria a tabela links
├── .env.example
├── docker-compose.yml
└── Dockerfile
```

---

## Setup local

**1. Clone e instale as dependências**

```bash
git clone https://github.com/seu-usuario/url-redirector.git
cd url-redirector
npm install
```

**2. Configure as variáveis de ambiente**

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais:

```env
DATABASE_URL=postgresql://adavid:senha@postgres:5432/postgres?sslmode=disable
API_KEY=sua-chave-aqui
PORT=3000
DOMAIN_RULE=Host(`r.seudominio.com`)
```

**3. Rode a migration**

Cole o conteúdo de `migrations/001_init.sql` no seu Postgres e execute.

**4. Inicie o servidor**

```bash
npm run dev
```

---

## Deploy no VPS

Certifique-se de que o `.env` está preenchido com os valores reais e que a rede `traefik-net` do Traefik já existe. Depois:

```bash
docker compose up -d --build
```

---

## Endpoints

### Público

| Método | Rota       | Descrição                         |
|--------|------------|-----------------------------------|
| GET    | `/:slug`   | Redireciona para a URL de destino |

### Admin

Todas as rotas abaixo exigem o header `X-API-Key: <sua_chave>`.

| Método | Rota               | Descrição            |
|--------|--------------------|----------------------|
| POST   | `/api/links`       | Cria um link         |
| GET    | `/api/links`       | Lista todos os links |
| DELETE | `/api/links/:slug` | Remove um link       |

---

## Exemplos

**Criar um link**

```bash
curl -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sua-chave-aqui" \
  -d '{"slug": "yt", "target_url": "https://youtube.com"}'
```

**Testar o redirect**

```bash
curl -L http://localhost:3000/yt
```

**Listar links**

```bash
curl http://localhost:3000/api/links \
  -H "X-API-Key: sua-chave-aqui"
```

**Deletar um link**

```bash
curl -X DELETE http://localhost:3000/api/links/yt \
  -H "X-API-Key: sua-chave-aqui"
```
