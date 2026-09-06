import { db } from "../db/db";
import {
  type Player,
  type Game,
  type Board,
  boards,
  gameMemberships,
  prompts,
  type Prompt,
  players,
} from "../db/schema";
import type { Transactable } from "../db/db";
import { eq } from "drizzle-orm";
import { requirePlayerMemberOfGame } from "./auth";
import { createPrompt, getPromptGenerationContextForBoard } from "./prompt";

export const BOARD_WIDTH = 5;
export const BOARD_HEIGHT = 5;

export async function createBoard({
  player,
  game,
  tx = db,
}: {
  player: Player;
  game: Game;
  tx?: Transactable;
}): Promise<Board> {
  // Only the board row and its instant free space square are created here —
  // the 24 AI-generated squares are filled in afterwards by
  // `populateBoardPrompts`, run in the background so `startGame` can return
  // immediately. See core/game.ts#startGame.
  return await tx.transaction(async (tx) => {
    const membership = await requirePlayerMemberOfGame({ player, game, tx });
    const board = (
      await tx
        .insert(boards)
        .values({
          gameMembershipId: membership.id,
        })
        .returning()
    )[0]!;
    if (BOARD_WIDTH % 2 === 1 && BOARD_HEIGHT % 2 === 1) {
      await createPrompt({
        board,
        row: Math.floor(BOARD_HEIGHT / 2),
        column: Math.floor(BOARD_WIDTH / 2),
        tx,
      });
    }
    return board;
  });
}

/**
 * Fills in the remaining (non-free-space) squares of a board that
 * `createBoard` left empty. Idempotent — a board that already has some
 * squares (e.g. a retry after a previous failure) only generates the ones
 * still missing — so it's safe to call again after `failedAt` is set.
 */
export async function populateBoardPrompts({
  board,
  tx = db,
}: {
  board: Board;
  tx?: Transactable;
}): Promise<void> {
  try {
    const existingCells = new Set(
      (await getPromptsForBoard({ board, tx })).map((prompt) => `${prompt.row},${prompt.column}`),
    );
    const missingCells: { row: number; column: number }[] = [];
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      for (let column = 0; column < BOARD_WIDTH; column++) {
        if (!existingCells.has(`${row},${column}`)) {
          missingCells.push({ row, column });
        }
      }
    }
    if (missingCells.length > 0) {
      // Fetched once and reused for every cell, instead of every one of the
      // ~24 `createPrompt` calls re-querying the player/roster itself.
      const context = await getPromptGenerationContextForBoard({ board, tx });
      for (const { row, column } of missingCells) {
        await createPrompt({ board, row, column, context, tx });
      }
    }
    await tx
      .update(boards)
      .set({ readyAt: new Date(), failedAt: null })
      .where(eq(boards.id, board.id));
  } catch (err) {
    await tx.update(boards).set({ failedAt: new Date() }).where(eq(boards.id, board.id));
    throw err;
  }
}

export async function getBoardsForGame({
  game,
  tx = db,
}: {
  game: Game;
  tx?: Transactable;
}): Promise<Board[]> {
  return (
    await tx
      .select()
      .from(boards)
      .innerJoin(gameMemberships, eq(boards.gameMembershipId, gameMemberships.id))
      .where(eq(gameMemberships.gameId, game.id))
  ).map((row) => row.boards);
}

export async function areAllBoardsReady({
  game,
  tx = db,
}: {
  game: Game;
  tx?: Transactable;
}): Promise<boolean> {
  const gameBoards = await getBoardsForGame({ game, tx });
  return gameBoards.length > 0 && gameBoards.every((board) => board.readyAt !== null);
}

export async function didAnyBoardFail({
  game,
  tx = db,
}: {
  game: Game;
  tx?: Transactable;
}): Promise<boolean> {
  const gameBoards = await getBoardsForGame({ game, tx });
  return gameBoards.some((board) => board.failedAt !== null);
}

export async function getBoardByPlayerAndGame({
  player,
  game,
  tx = db,
}: {
  player: Player;
  game: Game;
  tx?: Transactable;
}): Promise<Board | null> {
  const membership = await requirePlayerMemberOfGame({ player, game, tx });
  return (
    (await tx.select().from(boards).where(eq(boards.gameMembershipId, membership.id)))[0] ?? null
  );
}

export async function getPromptsForBoard({
  board,
  tx = db,
}: {
  board: Board;
  tx?: Transactable;
}): Promise<Prompt[]> {
  return await tx.select().from(prompts).where(eq(prompts.boardId, board.id));
}

export async function isBoardWon({
  board,
  tx = db,
}: {
  board: Board;
  tx?: Transactable;
}): Promise<boolean> {
  const promptsForBoard = await getPromptsForBoard({ board, tx });

  // Boards now populate in the background (see core/game.ts#startGame), so a
  // freshly-created board can briefly have only its free space square. `.every`
  // on an empty/short line is vacuously true, so require the full line to be
  // present before checking completion — otherwise an unpopulated board would
  // look "won" on every row and column it hasn't generated yet.

  // Check rows
  for (let row = 0; row < BOARD_HEIGHT; row++) {
    const line = promptsForBoard.filter((prompt) => prompt.row === row);
    const isRowComplete =
      line.length === BOARD_WIDTH && line.every((prompt) => !!prompt.completedAt);
    if (isRowComplete) {
      return true;
    }
  }

  // Check columns
  for (let column = 0; column < BOARD_WIDTH; column++) {
    const line = promptsForBoard.filter((prompt) => prompt.column === column);
    const isColumnComplete =
      line.length === BOARD_HEIGHT && line.every((prompt) => !!prompt.completedAt);
    if (isColumnComplete) {
      return true;
    }
  }

  if (BOARD_WIDTH === BOARD_HEIGHT) {
    // Check diagonals
    const topLeftToBottomRight = promptsForBoard.filter((prompt) => prompt.row === prompt.column);
    const isTopLeftToBottomRightComplete =
      topLeftToBottomRight.length === BOARD_WIDTH &&
      topLeftToBottomRight.every((prompt) => !!prompt.completedAt);
    if (isTopLeftToBottomRightComplete) {
      return true;
    }

    const topRightToBottomLeft = promptsForBoard.filter(
      (prompt) => prompt.row + prompt.column === BOARD_WIDTH - 1,
    );
    const isTopRightToBottomLeftComplete =
      topRightToBottomLeft.length === BOARD_WIDTH &&
      topRightToBottomLeft.every((prompt) => !!prompt.completedAt);
    if (isTopRightToBottomLeftComplete) {
      return true;
    }
  }

  return false;
}

export async function getWinningBoard({
  game,
  tx = db,
}: {
  game: Game;
  tx?: Transactable;
}): Promise<Board | null> {
  return await tx.transaction(async (tx) => {
    const gameBoards = await getBoardsForGame({ game, tx });
    for (const board of gameBoards) {
      if (await isBoardWon({ board, tx })) {
        return board;
      }
    }
    return null;
  });
}

export async function getWinningPlayer({
  game,
  tx = db,
}: {
  game: Game;
  tx?: Transactable;
}): Promise<Player | null> {
  return await tx.transaction(async (tx) => {
    const winningBoard = await getWinningBoard({ game, tx });
    if (!winningBoard) {
      return null;
    }
    return (
      await tx
        .select()
        .from(gameMemberships)
        .innerJoin(players, eq(gameMemberships.playerId, players.id))
        .where(eq(gameMemberships.id, winningBoard.gameMembershipId))
    )[0]!.players;
  });
}
