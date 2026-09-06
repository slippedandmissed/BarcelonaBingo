import { db, type Transactable } from "../db/db";
import { games, gameMemberships, type Player, type Game, type Board, players } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { HttpError } from "./errors/http_error";
import { createBoard, getBoardsForGame, getWinningBoard, populateBoardPrompts } from "./board";
import { generateRandomCode } from "./code";
import { requirePlayerMemberOfGame } from "./auth";

export async function createGame({
  name,
  player,
  isHostRemote,
  tx = db,
}: {
  name: string;
  player: Player;
  isHostRemote: boolean;
  tx?: Transactable;
}): Promise<Game> {
  return await tx.transaction(async (tx) => {
    const game = (
      await tx
        .insert(games)
        .values({
          name,
          code: generateRandomCode(),
        })
        .returning()
    )[0]!;
    await joinGame({ game, player, isRemote: isHostRemote, tx });
    return game;
  });
}

export async function getGameById({
  player,
  id,
  tx = db,
}: {
  player: Player;
  id: string;
  tx?: Transactable;
}): Promise<Game | null> {
  return await tx.transaction(async (tx) => {
    const game = (await tx.select().from(games).where(eq(games.id, id)))[0] ?? null;
    if (game) {
      await requirePlayerMemberOfGame({ player, game, tx });
    }
    return game;
  });
}

export async function getGameByCode({
  code,
  tx = db,
}: {
  code: string;
  tx?: Transactable;
}): Promise<Game | null> {
  return (await tx.select().from(games).where(eq(games.code, code)))[0] ?? null;
}

export async function joinGame({
  game,
  player,
  isRemote,
  tx = db,
}: {
  game: Game;
  player: Player;
  isRemote: boolean;
  tx?: Transactable;
}): Promise<void> {
  return await tx.transaction(async (tx) => {
    if (game.startedAt) {
      throw new HttpError(400, "Cannot join a game that has already started.");
    }
    if (await isGameEnded({ game, tx })) {
      throw new HttpError(400, "Cannot join a game that has already ended.");
    }
    const existingMembership = await tx
      .select()
      .from(gameMemberships)
      .where(and(eq(gameMemberships.gameId, game.id), eq(gameMemberships.playerId, player.id)))
      .limit(1)
      .then((rows) => rows[0] ?? null);
    if (existingMembership) {
      throw new HttpError(400, "Player is already a member of this game.");
    }
    await tx.insert(gameMemberships).values({
      gameId: game.id,
      playerId: player.id,
      isRemote: isRemote,
    });
  });
}

export async function isGameEnded({ game, tx = db }: { game: Game; tx?: Transactable }) {
  return !!game.abortedAt || (await getWinningBoard({ game, tx })) !== null;
}

export async function removePlayerFromGame({
  player,
  game,
  tx = db,
}: {
  player: Player;
  game: Game;
  tx?: Transactable;
}): Promise<void> {
  return await tx.transaction(async (tx) => {
    if (game.startedAt) {
      throw new HttpError(400, "Cannot leave a game that has already started.");
    }
    if (await isGameEnded({ game, tx })) {
      throw new HttpError(400, "Cannot leave a game that has already ended.");
    }
    await tx
      .delete(gameMemberships)
      .where(and(eq(gameMemberships.gameId, game.id), eq(gameMemberships.playerId, player.id)));
  });
}

export async function abortGame({
  game,
  tx = db,
}: {
  game: Game;
  tx?: Transactable;
}): Promise<void> {
  return await tx.transaction(async (tx) => {
    if (await isGameEnded({ game, tx })) {
      throw new HttpError(400, "Cannot abort a game that has already ended.");
    }
    await tx.update(games).set({ abortedAt: new Date() }).where(eq(games.id, game.id));
  });
}

export async function listGameMembers({
  game,
  tx = db,
}: {
  game: Game;
  tx?: Transactable;
}): Promise<Player[]> {
  return (
    await tx
      .select()
      .from(gameMemberships)
      .innerJoin(players, eq(players.id, gameMemberships.playerId))
      .where(eq(gameMemberships.gameId, game.id))
  ).map((row) => row.players);
}

/**
 * Marks the game started and creates each player's board, then returns
 * immediately — the per-player challenge generation is the slow, LLM-bound
 * part, so it's kicked off in the background rather than awaited here. The
 * frontend polls `GET /game/:gameId` (`boardsReady` / `boardsFailed`) and
 * shows the board once every player's is ready.
 *
 * Calling this again on an already-started game is how a retry after a
 * failed generation works: nothing about the "not started yet" setup re-runs,
 * only the boards still marked `failedAt` are regenerated.
 */
export async function startGame({
  game,
  tx = db,
}: {
  game: Game;
  tx?: Transactable;
}): Promise<void> {
  const boardsToPopulate = await tx.transaction(async (tx) => {
    if (await isGameEnded({ game, tx })) {
      throw new HttpError(400, "Cannot start a game that has already ended.");
    }
    if (!game.startedAt) {
      await tx.update(games).set({ startedAt: new Date() }).where(eq(games.id, game.id));
      const members = await listGameMembers({ game, tx });
      const newBoards: Board[] = [];
      for (const member of members) {
        newBoards.push(await createBoard({ player: member, game, tx }));
      }
      return newBoards;
    }
    return (await getBoardsForGame({ game, tx })).filter((board) => board.failedAt !== null);
  });

  // Not awaited: generating all these boards' challenges in parallel (rather
  // than one big transaction looping over every player, like before) is what
  // makes N players' worth of generation take about as long as one player's,
  // not N times as long.
  for (const board of boardsToPopulate) {
    void populateBoardPrompts({ board }).catch((err) => {
      console.error(`Failed to generate board ${board.id}'s challenges`, err);
    });
  }
}

export async function getGamesForPlayer({
  player,
  tx = db,
}: {
  player: Player;
  tx?: Transactable;
}): Promise<Game[]> {
  return (
    await tx
      .select()
      .from(gameMemberships)
      .innerJoin(games, eq(games.id, gameMemberships.gameId))
      .where(eq(gameMemberships.playerId, player.id))
  ).map((row) => row.games);
}
export async function deleteGame({
  game,
  tx = db,
}: {
  game: Game;
  tx?: Transactable;
}): Promise<void> {
  await tx.delete(games).where(eq(games.id, game.id));
}
