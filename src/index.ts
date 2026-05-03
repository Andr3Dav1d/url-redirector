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
