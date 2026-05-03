import "dotenv/config";
import express from "express";
import path from "path";
import * as h from "./handler/redirect";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Dashboard
app.get("/dashboard", (_req, res) => {
  res.sendFile(path.join(__dirname, "../public/dashboard.html"));
});

// Admin API
const api = express.Router();
api.use(h.apiKeyMiddleware);
api.post("/links", h.createLink);
api.get("/links", h.listLinks);
api.delete("/links/:slug", h.deleteLink);
app.use("/api", api);

// Redirect — tem que ser a última rota
app.get("/:slug", h.redirect);

const port = process.env.PORT ?? 3000;
app.listen(port, () => console.log(`rodando na porta ${port}`));
