# backend/CLAUDE.md

The Barcelona Bingo API — [Elysia](https://elysiajs.com) + [Drizzle](https://orm.drizzle.team)
+ PostgreSQL, running on Bun. Read the repo-root `CLAUDE.md` first; this file only
adds backend detail.

## Runtime: prefer Bun's built-ins

- `bun <file>` / `bun test` / `bun install` / `bun run <script>` / `bunx` — never
  the Node equivalents.
- `Bun.file(...)` over `node:fs` (see `core/prompt.ts` loading the Mustache
  template).
- Bun auto-loads `.env`; don't add `dotenv`.
- Postgres access goes through Drizzle (`db/db.ts`), which wraps the `postgres`
  driver — don't reach for `pg` or `Bun.sql` directly.

## Structure

| Path | Role |
|---|---|
| `src/index.ts` | App wiring: CORS → error handler → API. Exports `type App` (the frontend's typed client is built from this). |
| `src/config.ts` | TypeBox-validated `process.env` → typed `config` object. Also constructs the AI driver. |
| `src/api/*` | Elysia route groups. HTTP shape + `body`/`response` schemas + auth only. |
| `src/core/*` | All business logic. |
| `src/core/ai/*` | `AiDriver` abstract class + `mock` and `anthropic` implementations. |
| `src/db/schema/*` | Drizzle tables (`players`, `sessions`, `games`, `gameMemberships`, `boards`, `prompts`, `cachedPrompts`). |
| `assets/challenge_prompt.mustache` | The AI system prompt. |

## Conventions

- **Every `core` function** takes `tx: Transactable = db` and wraps work in
  `tx.transaction(async (tx) => …)`. This is how they stay composable and atomic.
- **Routes** resolve auth with the `requireSession` plugin (from `core/auth.ts`),
  which provides `{ player, session }` and 401s otherwise. Public routes
  (`POST /player`, `GET /player/login`, `GET /player/:id`) skip it.
- **Errors**: `throw new HttpError(status, message)`; never build error responses
  by hand.
- **Membership checks**: `requirePlayerMemberOfGame` (403 if not a member) guards
  game/board/prompt access — keep new game routes behind it.

## Local dev & DB

This package is driven via `docker compose` (see `docker-compose.yml`): `postgres`,
`adminer`, an `nginx` reverse proxy on port `1234`, and `bingo_server` (the API,
`bun run --watch`).

```bash
bun run dev:up        # start everything
bun run dev:tail      # follow API logs
bun run dev:down      # stop
bun run db:generate   # schema change -> SQL migration in drizzle/ (commit it)
bun run db:migrate    # apply migrations
```

`db:generate` / `db:migrate` run `drizzle-kit` *inside* the Compose network so it
can resolve `POSTGRES_HOST=postgres`. Running them from the host won't work.

## Adding an env var

1. Add it to the `Env` schema in `src/config.ts` and surface it under `config`.
2. Add it to `.env` and `.env.example`.
3. If containers need it at build/run time, wire it through `docker-compose.yml`.
