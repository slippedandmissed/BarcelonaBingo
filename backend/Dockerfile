# Production image for the Barcelona Bingo backend.
#
# IMPORTANT: the build context is the REPO ROOT (set via `build.dockerfile` in
# /fly.toml), not backend/ — so the Bun workspace root package.json + bun.lock
# are available for a frozen-lockfile install.

FROM oven/bun:1-alpine

WORKDIR /app

# --- Dependencies ---------------------------------------------------------------
# Copy every workspace manifest so `--frozen-lockfile` can validate the whole
# graph, then install. devDependencies are kept on purpose: `drizzle-kit` runs
# at release time (see release_command in fly.toml).
COPY package.json bun.lock ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN bun install --frozen-lockfile

# --- App source ---------------------------------------------------------------
COPY backend ./backend

WORKDIR /app/backend
ENV NODE_ENV=production
EXPOSE 8080
USER bun
CMD ["bun", "run", "src/index.ts"]
