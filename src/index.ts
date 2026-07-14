import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import * as h from "./handler/redirect";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
	const startedAt = Date.now();
	res.on("finish", () => {
		const elapsedMs = Date.now() - startedAt;
		console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${elapsedMs}ms`);
	});
	next();
});

const publicLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 300,
	standardHeaders: true,
	legacyHeaders: false,
});

const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 120,
	standardHeaders: true,
	legacyHeaders: false,
});

const routesResponse = {
	name: "url-redirector",
	description: "API de redirecionamento e estatísticas",
	routes: {
		docs: ["/docs", "/docs.json"],
		health: "/health",
		public: ["/", "/:slug"],
		admin: ["/api/links", "/api/stats"],
	},
} as const;

const openApiDocument = {
	openapi: "3.0.3",
	info: {
		title: "URL Redirector API",
		version: "1.0.0",
		description: "API para encurtamento, redirecionamento e estatísticas de links.",
	},
	servers: [
		{
			url: "/",
		},
	],
	components: {
		schemas: {
			RootResponse: {
				type: "object",
				required: ["name", "description", "routes"],
				properties: {
					name: { type: "string", example: "url-redirector" },
					description: { type: "string", example: "API de redirecionamento e estatísticas" },
					routes: {
						type: "object",
						required: ["docs", "health", "public", "admin"],
						properties: {
							docs: {
								type: "array",
								items: { type: "string" },
								example: ["/docs", "/docs.json"],
							},
							health: { type: "string", example: "/health" },
							public: {
								type: "array",
								items: { type: "string" },
								example: ["/", "/:slug"],
							},
							admin: {
								type: "array",
								items: { type: "string" },
								example: ["/api/links", "/api/stats"],
							},
						},
					},
				},
			},
			CreateLinkRequest: {
				type: "object",
				required: ["slug", "target_url"],
				properties: {
					slug: {
						type: "string",
						example: "yt",
						description: "Identificador curto usado na URL final.",
					},
					target_url: {
						type: "string",
						example: "https://youtube.com",
						description: "URL de destino completa.",
					},
				},
			},
			Link: {
				type: "object",
				required: ["id", "slug", "target_url", "clicks", "created_at"],
				properties: {
					id: { type: "integer", example: 1 },
					slug: { type: "string", example: "yt" },
					target_url: { type: "string", example: "https://youtube.com" },
					clicks: { type: "integer", example: 120 },
					created_at: {
						type: "string",
						format: "date-time",
						example: "2026-07-14T12:00:00.000Z",
					},
				},
			},
			Stats: {
				type: "object",
				required: ["total_links", "total_clicks", "active_links", "top_links", "recent_links"],
				properties: {
					total_links: { type: "integer", example: 12 },
					total_clicks: { type: "integer", example: 481 },
					active_links: { type: "integer", example: 9 },
					top_links: {
						type: "array",
						items: { $ref: "#/components/schemas/Link" },
					},
					recent_links: {
						type: "array",
						items: { $ref: "#/components/schemas/Link" },
					},
				},
			},
			ErrorResponse: {
				type: "object",
				required: ["error"],
				properties: {
					error: { type: "string", example: "Link não encontrado" },
				},
			},
			HealthResponse: {
				type: "object",
				required: ["status", "service", "timestamp"],
				properties: {
					status: { type: "string", example: "ok" },
					service: { type: "string", example: "url-redirector" },
					timestamp: { type: "string", format: "date-time", example: "2026-07-14T12:00:00.000Z" },
				},
			},
		},
		securitySchemes: {
			ApiKeyAuth: {
				type: "apiKey",
				in: "header",
				name: "X-API-Key",
			},
		},
	},
	security: [{ ApiKeyAuth: [] }],
	tags: [
		{ name: "Public" },
		{ name: "Admin" },
	],
	paths: {
		"/": {
			get: {
				tags: ["Public"],
				summary: "Rotas disponíveis",
				responses: {
					200: {
						description: "JSON com as rotas principais da API",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/RootResponse" },
								example: routesResponse,
							},
						},
					},
				},
			},
		},
		"/health": {
			get: {
				tags: ["Public"],
				summary: "Healthcheck da aplicação",
				responses: {
					200: {
						description: "Aplicação saudável",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/HealthResponse" },
								example: {
									status: "ok",
									service: "url-redirector",
									timestamp: "2026-07-14T12:00:00.000Z",
								},
							},
						},
					},
				},
			},
		},
		"/api/links": {
			get: {
				tags: ["Admin"],
				summary: "Lista links",
				security: [{ ApiKeyAuth: [] }],
				responses: {
					200: {
						description: "Lista de links",
						content: {
							"application/json": {
								schema: {
									type: "array",
									items: { $ref: "#/components/schemas/Link" },
								},
								example: [
									{
										id: 1,
										slug: "yt",
										target_url: "https://youtube.com",
										clicks: 120,
										created_at: "2026-07-14T12:00:00.000Z",
									},
								],
							},
						},
					},
					401: {
						description: "Chave inválida",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" },
								example: { error: "Chave inválida" },
							},
						},
					},
					429: {
						description: "Muitas requisições",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" },
								example: { error: "Too many requests, please try again later." },
							},
						},
					},
				},
			},
			post: {
				tags: ["Admin"],
				summary: "Cria link",
				security: [{ ApiKeyAuth: [] }],
				requestBody: {
					required: true,
					content: {
						"application/json": {
							schema: { $ref: "#/components/schemas/CreateLinkRequest" },
							example: {
								slug: "yt",
								target_url: "https://youtube.com",
							},
						},
					},
				},
				responses: {
					201: {
						description: "Link criado",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Link" },
								example: {
									id: 1,
									slug: "yt",
									target_url: "https://youtube.com",
									clicks: 0,
									created_at: "2026-07-14T12:00:00.000Z",
								},
							},
						},
					},
					400: {
						description: "Dados obrigatórios ausentes",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" },
								example: { error: "Slug e target_url são obrigatórios" },
							},
						},
					},
					401: {
						description: "Chave inválida",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" },
								example: { error: "Chave inválida" },
							},
						},
					},
					429: {
						description: "Muitas requisições",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" },
								example: { error: "Too many requests, please try again later." },
							},
						},
					},
				},
			},
		},
		"/api/stats": {
			get: {
				tags: ["Admin"],
				summary: "Retorna estatísticas",
				security: [{ ApiKeyAuth: [] }],
				responses: {
					200: {
						description: "Resumo estatístico dos links",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/Stats" },
								example: {
									total_links: 12,
									total_clicks: 481,
									active_links: 9,
									top_links: [],
									recent_links: [],
								},
							},
						},
					},
					401: {
						description: "Chave inválida",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" },
								example: { error: "Chave inválida" },
							},
						},
					},
					429: {
						description: "Muitas requisições",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" },
								example: { error: "Too many requests, please try again later." },
							},
						},
					},
				},
			},
		},
		"/api/links/{slug}": {
			delete: {
				tags: ["Admin"],
				summary: "Remove um link",
				security: [{ ApiKeyAuth: [] }],
				parameters: [
					{
						name: "slug",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
						204: { description: "Link removido" },
						401: {
							description: "Chave inválida",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/ErrorResponse" },
									example: { error: "Chave inválida" },
								},
							},
						},
						429: {
							description: "Muitas requisições",
							content: {
								"application/json": {
									schema: { $ref: "#/components/schemas/ErrorResponse" },
									example: { error: "Too many requests, please try again later." },
								},
							},
						},
				},
			},
		},
		"/{slug}": {
			get: {
				tags: ["Public"],
				summary: "Redireciona para a URL de destino",
				parameters: [
					{
						name: "slug",
						in: "path",
						required: true,
						schema: { type: "string" },
					},
				],
				responses: {
					301: { description: "Redirecionamento" },
					404: {
						description: "Link não encontrado",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" },
								example: { error: "Link não encontrado" },
							},
						},
					},
					429: {
						description: "Muitas requisições",
						content: {
							"application/json": {
								schema: { $ref: "#/components/schemas/ErrorResponse" },
								example: { error: "Too many requests, please try again later." },
							},
						},
					},
				},
			},
		},
	},
} as const;

app.get("/", publicLimiter, (_req, res) => {
	res.json(routesResponse);
});

app.get("/health", (_req, res) => {
	res.json({
		status: "ok",
		service: "url-redirector",
		timestamp: new Date().toISOString(),
	});
});

app.get("/docs.json", publicLimiter, (_req, res) => {
	res.json(openApiDocument);
});

app.use("/docs", publicLimiter, swaggerUi.serve, swaggerUi.setup(openApiDocument, { explorer: true }));

// Admin API
const api = express.Router();
api.use(h.apiKeyMiddleware);
api.post("/links", h.createLink);
api.get("/links", h.listLinks);
api.get("/stats", h.getStats);
api.delete("/links/:slug", h.deleteLink);
app.use("/api", apiLimiter, api);

// Redirect — tem que ser a última rota
app.get("/:slug", publicLimiter, h.redirect);

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
	console.log(
		`url-redirector pronto na porta ${port} | / -> rotas | /health -> healthcheck | /docs -> swagger`,
	);
});
