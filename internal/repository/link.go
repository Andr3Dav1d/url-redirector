package repository

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Link struct {
	ID        int       `json:"id"`
	Slug      string    `json:"slug"`
	TargetURL string    `json:"target_url"`
	Clicks    int       `json:"clicks"`
	CreatedAt time.Time `json:"created_at"`
}

type LinkRepository struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *LinkRepository {
	return &LinkRepository{pool: pool}
}

func (r *LinkRepository) GetBySlug(ctx context.Context, slug string) (*Link, error) {
	link := &Link{}
	err := r.pool.QueryRow(ctx,
		`SELECT id, slug, target_url, clicks, created_at FROM links WHERE slug = $1`,
		slug,
	).Scan(&link.ID, &link.Slug, &link.TargetURL, &link.Clicks, &link.CreatedAt)
	if err != nil {
		return nil, err
	}
	return link, nil
}

func (r *LinkRepository) IncrementClicks(ctx context.Context, slug string) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE links SET clicks = clicks + 1 WHERE slug = $1`,
		slug,
	)
	return err
}

func (r *LinkRepository) Create(ctx context.Context, slug, targetURL string) (*Link, error) {
	link := &Link{}
	err := r.pool.QueryRow(ctx,
		`INSERT INTO links (slug, target_url) VALUES ($1, $2)
		 RETURNING id, slug, target_url, clicks, created_at`,
		slug, targetURL,
	).Scan(&link.ID, &link.Slug, &link.TargetURL, &link.Clicks, &link.CreatedAt)
	if err != nil {
		return nil, err
	}
	return link, nil
}

func (r *LinkRepository) List(ctx context.Context) ([]Link, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT id, slug, target_url, clicks, created_at FROM links ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var links []Link
	for rows.Next() {
		var l Link
		if err := rows.Scan(&l.ID, &l.Slug, &l.TargetURL, &l.Clicks, &l.CreatedAt); err != nil {
			return nil, err
		}
		links = append(links, l)
	}
	return links, nil
}

func (r *LinkRepository) Delete(ctx context.Context, slug string) error {
	_, err := r.pool.Exec(ctx,
		`DELETE FROM links WHERE slug = $1`,
		slug,
	)
	return err
}
