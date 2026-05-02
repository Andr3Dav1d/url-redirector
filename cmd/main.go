package main

import (
	"log"
	"os"

	"github.com/andreseu/url-redirector/internal/db"
	"github.com/andreseu/url-redirector/internal/handler"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)

func main() {
	// Carrega .env em desenvolvimento; ignora erro em produção (variáveis já injetadas)
	_ = godotenv.Load()

	pool, err := db.Connect(os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("falha ao conectar no banco: %v", err)
	}
	defer pool.Close()

	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	app.Use(logger.New())

	h := handler.New(pool)

	// Rotas públicas
	app.Get("/:slug", h.Redirect)

	// Rotas de admin (protegidas por API key via middleware)
	api := app.Group("/api", handler.APIKeyMiddleware(os.Getenv("API_KEY")))
	api.Post("/links", h.CreateLink)
	api.Get("/links", h.ListLinks)
	api.Delete("/links/:slug", h.DeleteLink)

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Printf("rodando na porta %s", port)
	log.Fatal(app.Listen(":" + port))
}
