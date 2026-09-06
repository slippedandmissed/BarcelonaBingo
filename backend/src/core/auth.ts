import Elysia from "elysia";
import {
  gameMemberships,
  sessions,
  type Game,
  type GameMembership,
  type Player,
  type Session,
} from "../db/schema";
import { getPlayerById } from "./player";
import { db, type Transactable } from "../db/db";
import { and, eq, lt } from "drizzle-orm";
import { HttpError } from "./errors/http_error";

export const SESSION_COOKIE_NAME = "__session" as const;

// Shared by the session row's `expiresAt` and the cookie's `maxAge` (in
// api/player.ts) so the two can't drift apart.
export const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

export async function createSessionForPlayer({
  player,
  tx = db,
}: {
  player: Player;
  tx?: Transactable;
}): Promise<Session> {
  return (
    await tx
      .insert(sessions)
      .values({
        playerId: player.id,
        expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
      })
      .returning()
  )[0]!;
}

export async function getSessionById({
  sessionId,
  tx = db,
}: {
  sessionId: string;
  tx?: Transactable;
}): Promise<Session | null> {
  return await tx.transaction(async (tx) => {
    await tx.delete(sessions).where(lt(sessions.expiresAt, new Date()));

    const session = (
      await tx.select().from(sessions).where(eq(sessions.id, sessionId)).limit(1)
    )[0];

    return session ?? null;
  });
}

export const withSession = new Elysia({ name: "withSession" }).resolve(
  { as: "global" },
  async ({
    cookie,
  }): Promise<{ session: Session; player: Player } | { session: null; player: null }> => {
    return await db.transaction(async (tx) => {
      const sessionId = cookie[SESSION_COOKIE_NAME]?.value;
      if (typeof sessionId !== "string") {
        return { session: null, player: null };
      }
      const session = await getSessionById({ sessionId, tx });
      if (!session) {
        return { session: null, player: null };
      }
      const player = await getPlayerById({ id: session.playerId, tx });
      if (!player) {
        return { session: null, player: null };
      }
      return { session, player };
    });
  },
);

export const requireSession = new Elysia({ name: "requireSession" })
  .use(withSession)
  .onBeforeHandle({ as: "global" }, async ({ player }) => {
    if (!player) {
      throw new HttpError(401, "Unauthorized");
    }
  })
  .resolve({ as: "global" }, async ({ player, session }) => {
    return { session: session!, player: player! };
  });

export async function listSessionsForPlayer({
  player,
  tx = db,
}: {
  player: Player;
  tx?: Transactable;
}): Promise<Session[]> {
  return await tx.select().from(sessions).where(eq(sessions.playerId, player.id));
}

export async function revokeSession({
  player,
  sessionId,
  tx = db,
}: {
  player: Player;
  sessionId: string;
  tx?: Transactable;
}): Promise<void> {
  await tx
    .delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.playerId, player.id)));
}

export async function requirePlayerMemberOfGame({
  player,
  game,
  tx = db,
}: {
  player: Player;
  game: Game;
  tx?: Transactable;
}): Promise<GameMembership> {
  const [membership] = await tx
    .select()
    .from(gameMemberships)
    .where(and(eq(gameMemberships.gameId, game.id), eq(gameMemberships.playerId, player.id)));
  if (!membership) {
    throw new HttpError(403, "Player is not a member of the game.");
  }
  return membership;
}
