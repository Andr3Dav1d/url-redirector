# url-redirector

API de encurtamento e redirecionamento de URLs construída com Node.js, Express e TypeScript. Expõe JSON para consumo por outro projeto, como Streamlit, inclui Swagger/OpenAPI e usa PostgreSQL em qualquer VPS interna ou serviço compatível.

---

## Stack

- **Node.js 22** + **Express 4** + **TypeScript 5**
- **postgres.js** para conexão com PostgreSQL
- **Swagger UI** para documentação interativa
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

Edite o `.env` com os dados do seu Postgres na VPS ou no serviço que você estiver usando:

```env
DATABASE_URL=postgresql://usuario:senha@host-interno:5432/postgres
API_KEY=sua-chave-aqui
PORT=3000
DOMAIN=r.seudominio.com
```

**3. Rode a migration**

Execute a migration no Postgres alvo, via cliente SQL ou pipeline de deploy.

**4. Inicie o servidor**

```bash
npm run dev
```

---

## Deploy no VPS

Certifique-se de que o `.env` está preenchido com os valores reais e que a rede `proxy` do Traefik já existe. Depois:

```bash
docker compose up -d --build
```

---

## Endpoints

### Documentação

- `GET /docs` abre o Swagger UI
- `GET /docs.json` retorna o OpenAPI JSON
- `GET /health` retorna um healthcheck simples para o orquestrador

### Público

| Método | Rota       | Descrição                         |
|--------|------------|-----------------------------------|
| GET    | `/`        | JSON com as rotas disponíveis     |
| GET    | `/health`  | Healthcheck da aplicação          |
| GET    | `/:slug`   | Redireciona para a URL de destino |

### Admin

Todas as rotas abaixo exigem o header `X-API-Key: <sua_chave>`.

| Método | Rota               | Descrição            |
|--------|--------------------|----------------------|
| POST   | `/api/links`       | Cria um link         |
| GET    | `/api/links`       | Lista todos os links |
| GET    | `/api/stats`       | Retorna estatísticas  |
| DELETE | `/api/links/:slug` | Remove um link       |

### Exemplo de estatísticas

```json
{
  "total_links": 12,
  "total_clicks": 481,
  "active_links": 9,
  "top_links": [],
  "recent_links": []
}
```

### Exemplo da raiz

```json
{
  "name": "url-redirector",
  "description": "API de redirecionamento e estatísticas",
  "routes": {
    "docs": ["/docs", "/docs.json"],
    "health": "/health",
    "public": ["/", "/:slug"],
    "admin": ["/api/links", "/api/stats"]
  }
}
```

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

**Consultar estatísticas**

```bash
curl http://localhost:3000/api/stats \
  -H "X-API-Key: sua-chave-aqui"
```

**Deletar um link**

```bash
curl -X DELETE http://localhost:3000/api/links/yt \
  -H "X-API-Key: sua-chave-aqui"
```

## Consumo por Streamlit

O projeto agora funciona como backend puro. O Streamlit deve consumir os endpoints JSON em `/api/*` e montar a interface do lado dele.

## Produção

As proteções básicas já incluídas são:

- `helmet` para cabeçalhos de segurança
- rate limit para rotas públicas, Swagger e API
- validação de `slug` e `target_url` na criação de links
- `GET /health` para checagem externa
- `X-Powered-By` desativado

Para uso em produção, ainda vale manter o banco protegido, usar HTTPS no proxy e definir `API_KEY` e `DATABASE_URL` corretamente no ambiente.

### Integração sugerida

No projeto Streamlit, a integração básica pode seguir este fluxo:

```python
import requests
import streamlit as st

API_BASE_URL = "https://seu-dominio.com"
API_KEY = "sua-chave-aqui"

headers = {"X-API-Key": API_KEY}

links = requests.get(f"{API_BASE_URL}/api/links", headers=headers).json()
stats = requests.get(f"{API_BASE_URL}/api/stats", headers=headers).json()
```

### JSON esperado

`GET /api/links` retorna uma lista de objetos com esta estrutura:

```json
{
  "id": 1,
  "slug": "yt",
  "target_url": "https://youtube.com",
  "clicks": 120,
  "created_at": "2026-07-14T12:00:00.000Z"
}
```

`GET /api/stats` retorna um resumo com métricas e listas auxiliares:

```json
{
  "total_links": 12,
  "total_clicks": 481,
  "active_links": 9,
  "top_links": [],
  "recent_links": []
}
```

### Sugestão de uso no Streamlit

- usar `links` para tabelas e filtros
- usar `stats` para cards de resumo
- manter a chave `X-API-Key` protegida fora do frontend público
