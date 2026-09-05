# frontend

The Barcelona Bingo web app — React 19 (+ React Compiler), Vite, TanStack Query,
Tailwind CSS v4, and an [Eden Treaty](https://elysiajs.com/eden/treaty/overview)
client typed off the backend.

See the [repo root README](../README.md) for the full picture. Quick reference:

```bash
cp .env.example .env
bun run dev        # Vite on http://localhost:5173  (must be this port)
bun run build      # production build -> dist/
bun run typecheck
```

> The dev server has to run on **port 5173** — it's the only origin the API allows
> for CORS and login redirects.

## Layout

| Path | What |
|---|---|
| `src/pages/` | `Home` (sign-up / recovery-code login), `Dashboard` (create / join / your games) |
| `src/components/Game.tsx` | The bingo board, lobby, win/abort states |
| `src/components/ui.tsx` | Shared UI kit — buttons, cards, inputs, pills, avatars, modal shell, confetti |
| `src/hooks/` | `useGame`, `useGameIds`, `useAuthState`, `usePlayer` — TanStack Query wrappers |
| `src/utils/server.ts` | Typed API client (Eden Treaty) |
| `src/utils/gameStatus.ts` | Game-status derivation, labels, list sort order |
| `src/index.css` | Tailwind v4 theme — design tokens live in `@theme` / `@utility` |

Working on the code? See the repo-root [`CLAUDE.md`](../CLAUDE.md).
