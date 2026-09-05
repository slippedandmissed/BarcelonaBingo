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
import { createPrompt } from "./prompt";

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
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      for (let column = 0; column < BOARD_WIDTH; column++) {
        await createPrompt({ board, row, column, tx });
      }
    }
    return board;
  });
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

  // Check rows
  for (let row = 0; row < BOARD_HEIGHT; row++) {
    const isRowComplete = promptsForBoard
      .filter((prompt) => prompt.row === row)
      .every((prompt) => !!prompt.completedAt);
    if (isRowComplete) {
      return true;
    }
  }

  // Check columns
  for (let column = 0; column < BOARD_WIDTH; column++) {
    const isColumnComplete = promptsForBoard
      .filter((prompt) => prompt.column === column)
      .every((prompt) => !!prompt.completedAt);
    if (isColumnComplete) {
      return true;
    }
  }

  if (BOARD_WIDTH === BOARD_HEIGHT) {
    // Check diagonals
    const isTopLeftToBottomRightComplete = promptsForBoard
      .filter((prompt) => prompt.row === prompt.column)
      .every((prompt) => !!prompt.completedAt);
    if (isTopLeftToBottomRightComplete) {
      return true;
    }

    const isTopRightToBottomLeftComplete = promptsForBoard
      .filter((prompt) => prompt.row + prompt.column === BOARD_WIDTH - 1)
      .every((prompt) => !!prompt.completedAt);
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
    const gameBoards = await tx
      .select()
      .from(boards)
      .innerJoin(gameMemberships, eq(boards.gameMembershipId, gameMemberships.id))
      .where(eq(gameMemberships.gameId, game.id));
    for (const board of gameBoards) {
      if (await isBoardWon({ board: board.boards, tx })) {
        return board.boards;
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
