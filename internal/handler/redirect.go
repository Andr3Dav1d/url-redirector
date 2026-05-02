package handler

import (
	"errors"

	"github.com/andreseu/url-redirector/internal/repository"
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Handler struct {
	repo *repository.LinkRepository
}

func New(pool *pgxpool.Pool) *Handler {
	return &Handler{repo: repository.New(pool)}
}

// APIKeyMiddleware protege as rotas de admin com uma chave simples no header.
func APIKeyMiddleware(apiKey string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if c.Get("X-API-Key") != apiKey {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "chave inválida",
			})
		}
		return c.Next()
	}
}

// GET /:slug — redireciona e incrementa cliques
func (h *Handler) Redirect(c *fiber.Ctx) error {
	slug := c.Params("slug")

	link, err := h.repo.GetBySlug(c.Context(), slug)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error": "link não encontrado",
			})
		}
		return err
	}

	// Incrementa cliques em background — não bloqueia o redirect
	go func() {
		_ = h.repo.IncrementClicks(c.Context(), slug)
	}()

	return c.Redirect(link.TargetURL, fiber.StatusMovedPermanently)
}

// POST /api/links
type createRequest struct {
	Slug      string `json:"slug"`
	TargetURL string `json:"target_url"`
}

func (h *Handler) CreateLink(c *fiber.Ctx) error {
	var body createRequest
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "corpo inválido",
		})
	}
	if body.Slug == "" || body.TargetURL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "slug e target_url são obrigatórios",
		})
	}

	link, err := h.repo.Create(c.Context(), body.Slug, body.TargetURL)
	if err != nil {
		return err
	}

	return c.Status(fiber.StatusCreated).JSON(link)
}

// GET /api/links
func (h *Handler) ListLinks(c *fiber.Ctx) error {
	links, err := h.repo.List(c.Context())
	if err != nil {
		return err
	}
	return c.JSON(links)
}

// DELETE /api/links/:slug
func (h *Handler) DeleteLink(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if err := h.repo.Delete(c.Context(), slug); err != nil {
		return err
	}
	return c.SendStatus(fiber.StatusNoContent)
}
