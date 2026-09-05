# backend

The Barcelona Bingo API — Elysia + Drizzle ORM + PostgreSQL, on Bun.

See the [repo root README](../README.md) for the product overview and full setup.
Quick reference:

```bash
cp .env.example .env
bun run dev:up        # Postgres + Adminer + nginx + hot-reloading API (Docker)
bun run db:migrate    # apply migrations
bun run dev:tail      # follow API logs
bun run dev:down      # stop the stack
```

- API is reached via the nginx proxy at `http://barcelona-bingo.localhost:1234`.
- Database UI (Adminer, pre-authenticated): `http://db.barcelona-bingo.localhost:1234`
- Schema: `src/db/schema/`. After editing it: `bun run db:generate` then
  `bun run db:migrate`.

Working on the code? Read [`CLAUDE.md`](./CLAUDE.md).
