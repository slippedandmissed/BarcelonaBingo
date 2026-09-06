export type GameStatus =
  | "playing"
  | "lobby"
  | "generating"
  | "generation_failed"
  | "won"
  | "aborted";

export function getGameStatus(game: {
  startedAt: Date | null;
  abortedAt: Date | null;
  winner: string | null;
  boardsReady: boolean;
  boardsFailed: boolean;
}): GameStatus {
  if (game.abortedAt) return "aborted";
  if (game.winner) return "won";
  if (game.startedAt) {
    // Boards are generated in the background after start — see
    // core/game.ts#startGame on the backend.
    if (game.boardsFailed) return "generation_failed";
    if (!game.boardsReady) return "generating";
    return "playing";
  }
  return "lobby";
}

export const GAME_STATUS_LABEL: Record<GameStatus, string> = {
  playing: "In progress",
  lobby: "In the lobby",
  generating: "Dealing cards…",
  generation_failed: "Dealing cards failed",
  won: "Finished",
  aborted: "Called off",
};

/** Order the "Your games" list is shown in: live games first, dead games last. */
export const GAME_STATUS_SORT_ORDER: Record<GameStatus, number> = {
  playing: 0,
  generating: 1,
  generation_failed: 2,
  lobby: 3,
  won: 4,
  aborted: 5,
};
