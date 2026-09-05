# Barcelona Bingo

A party game for a group of friends on holiday together — a **"Don't Get Got"-style
challenge bingo**. Everyone gets their own 5×5 card of sneaky, AI-generated
challenges ("get someone to say a specific word", "swap shoes with someone for an
hour without them noticing"…). Complete them in real life, dab the square, and the
first person to a full line wins.

Challenges are generated per player and are aware of who else is playing and
whether they're there **in person** or joining **remotely**, so remote friends
still get things they can actually pull off over text.

---

## How it plays

1. **Sign up** with a name. You get a **recovery code** — that's your only login
   credential (no passwords, no email).
2. **Create a game** (you're the host) or **join one** with the host's 6-character
   code. Say whether you're playing in person or remotely.
3. The host **starts the game**. Everyone gets their own 5×5 card, freshly
   generated, with a free space in the middle.
4. Pull challenges off in real life, then open the square and **dab** it.
5. Stuck on one? **Swap it** for a new challenge — but it costs you: a random
   square you've already completed gets un-dabbed. (You can only swap once you've
   completed at least one non-free square.)
6. First player to complete any **row, column, or diagonal** wins, and the game
   ends. The host can **abort** any time before then.

---

## Tech stack

| Area        | Choice |
|-------------|--------|
| Runtime     | [Bun](https://bun.com) 1.3 |
| Monorepo    | Bun workspaces — `backend/` + `frontend/` |
| API         | [Elysia](https://elysiajs.com) |
| Database    | PostgreSQL 16 via [Drizzle ORM](https://orm.drizzle.team) + drizzle-kit migrations |
| Config      | TypeBox-validated environment |
| AI          | Anthropic SDK (`claude-haiku-4-5`) or a mock driver |
| Frontend    | React 19 (+ React Compiler), [Vite](https://vite.dev) 8 |
| Data layer  | [TanStack Query](https://tanstack.com/query) v5 (suspense) + [Eden Treaty](https://elysiajs.com/eden/treaty/overview) typed client |
| Styling     | Tailwind CSS v4 |
| Lint/format | [oxlint](https://oxc.rs) + oxfmt |
| Dev infra   | Docker Compose (Postgres, Adminer, nginx, hot-reloading API) |

---

## Repo layout

```
barcelona-bingo/
├── backend/                 Elysia API
│   ├── src/
│   │   ├── api/             Thin HTTP routes (schemas, auth) — no business logic
│   │   ├── core/            All game logic: game, board, prompt, auth, ai/…
│   │   └── db/              Drizzle schema + client
│   ├── drizzle/             Generated SQL migrations (do not hand-edit)
│   ├── assets/              challenge_prompt.mustache — the AI system prompt
│   └── docker-compose.yml   Dev stack
└── frontend/                React SPA
    └── src/
        ├── pages/           Home, Dashboard
        ├── components/      Game board, shared UI kit (ui.tsx)
        ├── hooks/           useGame, useGameIds, useAuthState, …
        └── utils/           Typed API client, game-status helpers
```

---

## Getting started

### Prerequisites

- **Bun** ≥ 1.3
- **Docker** + Docker Compose

### Setup

```bash
# From the repo root — installs both workspaces
bun install
```

**1. Backend stack** (Postgres + Adminer + nginx + the API, all in Docker — the API
hot-reloads as you edit files):

```bash
cd backend
cp .env.example .env          # edit if you like; defaults work for local dev
bun run dev:up                # start the containers
bun run db:migrate            # apply migrations
```

**2. Frontend** (runs on your host):

```bash
cd ../frontend
cp .env.example .env
bun run dev                   # Vite on http://localhost:5173
```

Open **http://localhost:5173**.

> ⚠️ The frontend **must** be served from `localhost:5173` — it's the only origin
> the API allows for CORS and login redirects (`ALLOWED_CORS_ORIGINS` /
> `ALLOWED_REDIRECT_ORIGINS`). If port 5173 is taken, free it rather than letting
> Vite fall back to another port.

### Handy commands

| Command | Where | What |
|---|---|---|
| `bun run dev:up` | `backend/` | Start the Docker stack |
| `bun run dev:down` | `backend/` | Stop it |
| `bun run dev:tail` | `backend/` | Follow the API logs |
| `bun run db:generate` | `backend/` | Generate a migration from schema changes |
| `bun run db:migrate` | `backend/` | Apply pending migrations |
| `bun run dev` | `frontend/` | Vite dev server |
| `bun run build` | `frontend/` | Production build → `frontend/dist/` |
| `bun run typecheck` | root | Typecheck both workspaces |
| `bun run lint` | root | oxlint both workspaces |
| `bun run fmt` | root | oxfmt (writes) both workspaces |

**Adminer** (database UI, pre-authenticated): http://db.barcelona-bingo.localhost:1234

---

## Environment variables

Both packages read a local `.env` (gitignored). Copy the `.env.example` in each.

### `backend/.env`

| Variable | Example | Notes |
|---|---|---|
| `POSTGRES_HOST` | `postgres` | Compose service name |
| `POSTGRES_PORT` | `5432` | |
| `POSTGRES_DB_NAME` | `bingo` | |
| `POSTGRES_USER` | `bingo_server` | |
| `POSTGRES_PASSWORD` | `password` | |
| `POSTGRES_SSL` | `false` | |
| `ALLOWED_CORS_ORIGINS` | `localhost:5173` | `;`-separated |
| `ALLOWED_REDIRECT_ORIGINS` | `http://localhost:5173` | `;`-separated; a login `redirectUrl`'s origin must appear here |
| `SERVER_SECURE` | `false` | `true` in production — sets the `Secure` flag on the session cookie |
| `PORT` | *(unset)* | Defaults to `80` inside the container |
| `AI_DRIVER` | `mock` | `mock` (constant text — fine for UI work) or `anthropic` |
| `ANTHROPIC_API_KEY` | `sk-ant-…` | **Always required** by the config schema, even for `mock`. Only actually used when `AI_DRIVER=anthropic`. |

### `frontend/.env`

| Variable | Example | Notes |
|---|---|---|
| `PROXY_SERVER_TARGET` | `http://barcelona-bingo.localhost:1234` | Where Vite proxies `/api` in dev (the nginx container) |
| `VITE_SERVER_URL` | *(unset)* | Optional runtime API base URL. Defaults to `window.location.origin`, which is correct in dev thanks to the proxy. |

---

## Database & migrations

Schema lives in `backend/src/db/schema/*.ts`. After changing it:

```bash
cd backend
bun run db:generate     # writes SQL into backend/drizzle/ — commit it
bun run db:migrate      # applies it
```

Both run `drizzle-kit` inside the Compose network so it can reach Postgres. Never
edit files under `backend/drizzle/` by hand.

---

## Deployment notes

- `backend/Dockerfile` builds a production image (copies source + `node_modules`,
  runs as a non-root user). For production set `SERVER_SECURE=true`, real
  `ALLOWED_*_ORIGINS`, and `AI_DRIVER=anthropic` with a valid key.
- Frontend: `bun run build` produces a static bundle in `frontend/dist/` to serve
  from any static host / CDN. Set `VITE_SERVER_URL` at build time if the API is on
  a different origin.

---

## Notes

- There is **no automated test suite** yet.
- Auth is deliberately minimal: a player's recovery `code` is the whole login
  system. Treat it like a password.
