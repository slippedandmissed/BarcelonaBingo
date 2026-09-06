# CLAUDE.md

**Barcelona Bingo** — an AI-generated "Don't Get Got"-style challenge-bingo game
for a group of friends on holiday. Bun monorepo, two workspaces: `backend/`
(Elysia API) and `frontend/` (React SPA).

`README.md` has the product description and full setup. This file is the working
brief for changing the code. `backend/CLAUDE.md` has backend-only detail.

## Environment & tooling

- **Bun 1.3 for everything**: `bun install`, `bun run <script>`, `bunx`. Never
  npm / yarn / pnpm / `node` / `ts-node`.
- **Before finishing any change**, from the repo root:
  `bun run typecheck && bun run lint && bun run fmt` — each fans out to both
  workspaces. Formatting is oxfmt's job; don't hand-format, just run `fmt`.
- **No test suite exists.** If you add one, use `bun test`.

## Running the app

- The **backend runs only in Docker** — its `POSTGRES_HOST` resolves on the
  Compose network. `cd backend && bun run dev:up`, logs via `bun run dev:tail`.
  The `bingo_server` container mounts the repo, so source edits hot-reload;
  dependency changes need `bun run dev:down && bun install && bun run dev:up`.
- The **frontend runs on the host**: `cd frontend && bun run dev`. It **must be on
  port 5173** — that origin is hardcoded into the API's CORS and login-redirect
  allowlists. If 5173 is busy, free it; don't accept Vite's fallback port.
- Both packages need a local `.env` (gitignored) — copy from `.env.example`.

## Backend (`backend/src`)

- **Layering, enforced by convention:**
  - `api/*` — thin Elysia routes only: URL shape, TypeBox `body`/`response`
    schemas, auth. No business logic here.
  - `core/*` — all game logic (`game`, `board`, `prompt`, `auth`, `code`, `ai/`).
  - `db/*` — Drizzle schema + client.
- **Transactions:** every `core` function takes an optional `tx: Transactable`
  (defaults to the `db` singleton) and wraps its work in `tx.transaction(...)` so
  callers can compose them atomically. New core functions must follow this shape.
- **Auth:** cookie session named `__session`. Gate routes with the `requireSession`
  Elysia plugin — it 401s when logged out and resolves `{ player, session }`.
  A player's recovery `code` is the only credential; there are no passwords.
- **Errors:** `throw new HttpError(status, message)`. The global `errorHandler`
  turns it into the response. Don't `set.status` + return by hand.
- **Config:** add new env vars to the TypeBox schema in `src/config.ts` *and* to
  both `backend/.env` and `backend/.env.example`. Note `ANTHROPIC_API_KEY` is
  required by the schema even when `AI_DRIVER=mock`.
- **AI:** call `config.ai.generateResponse(systemPrompt)`. Driver is chosen by
  `AI_DRIVER` (`mock` | `anthropic`). System prompt template:
  `assets/challenge_prompt.mustache` (Mustache).

## Database changes

1. Edit `src/db/schema/*.ts`.
2. `bun run db:generate` — emits SQL into `backend/drizzle/`. **Commit it.**
3. `bun run db:migrate`.

Never hand-edit anything under `backend/drizzle/`.

## Game rules — source of truth: `core/board.ts`, `core/prompt.ts`

- Board is **5×5** (`BOARD_WIDTH`/`BOARD_HEIGHT`). The centre square is an
  auto-completed **free space**.
- **Win = any full row, column, or diagonal.** The first winning board ends the
  game; `getWinningPlayer` names the winner.
- **Swap / regenerate a challenge:** only allowed once the player has ≥1 completed
  non-free square. It un-completes a *random* already-completed square as the
  cost.
- Challenges are generated **per player**, aware of the other players and each
  one's in-person/remote flag. They're produced in batches and cached, keyed by a
  "validity fingerprint" of the roster + remote flags (`core/prompt.ts`); a swap
  pulls from that cache, refilling it when empty.
- **Starting a game is async.** `startGame` marks the game started and creates
  each board's row + free space square, then kicks off per-board challenge
  generation in the background (not awaited) so the request returns
  immediately — the LLM calls are what made this slow, and Fly/browser
  connection timeouts don't tolerate a multi-minute response. `boards.readyAt`
  / `boards.failedAt` (set by `populateBoardPrompts`) surface as `boardsReady`
  / `boardsFailed` on `GET /game/:gameId`; the frontend polls that endpoint
  until ready. Calling `startGame` again on an already-started game retries
  only the boards left with `failedAt` set.

## Frontend (`frontend/src`)

- **React 19 with the React Compiler on.** Don't add manual `useMemo` /
  `useCallback` for performance. The `react(purity)` lint rule is enforced: no
  non-deterministic calls (`Math.random()`, `Date.now()`, …) during render —
  hoist them to a module-level function or a `useState` initializer (see
  `Confetti` in `components/ui.tsx`).
- **Data:** TanStack Query with `useSuspenseQuery` / `useSuspenseQueries`. Query
  keys in use: `["authState"]`, `["games"]`, `["game", id]`,
  `["game", id, "prompts", isReady]`, `["player", id]`. Mutations invalidate by
  key **prefix**. The `["game", id]` query polls every 2s while
  `getGameStatus(...) === "generating"` (see `useGame`) — that's what surfaces
  the background board generation started by `POST /game/:gameId/start`.
- **API client:** Eden Treaty in `utils/server.ts`, typed off the backend's
  exported `App` type. The `t.Object(...)` **`response` schemas in `api/*` are the
  contract** — when you change a payload, change both ends in the same pass.
- **Styling:** Tailwind CSS v4. Design tokens (colours `crema` / `tinta` / `sol` /
  `coral` / `mar` / `menta` / `uva`, the display/heading/body fonts, the
  `shadow-hard*` utilities) are defined in `index.css` via `@theme` / `@utility`.
  Reach for the shared kit in `components/ui.tsx` (`Button`, `Card`, `TextInput`,
  `Checkbox`, `Pill`, `Avatar`, `ModalShell`, `BingoChips`, `Confetti`,
  `CopyButton`) before hand-rolling markup.
- **Game status** (`lobby` / `playing` / `won` / `aborted`) is centralized in
  `utils/gameStatus.ts` — use `getGameStatus`, `GAME_STATUS_LABEL`,
  `GAME_STATUS_SORT_ORDER`. Don't re-derive it inline.
- **Modals** use the native `<dialog>` element driven by the invoker
  `command="show-modal"` / `commandfor` attributes. React's types don't know these
  yet, so a `// @ts-expect-error` on those props is expected, not a smell.

## Gotchas

- Frontend port `5173` is load-bearing (CORS + redirect allowlist).
- `.env` files exist locally but are gitignored; `.env.example` is the tracked
  reference.
- `getGameById` etc. enforce membership — a player can only see games they've
  joined.
