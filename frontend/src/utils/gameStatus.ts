export type GameStatus = "playing" | "lobby" | "won" | "aborted";

export function getGameStatus(game: {
  startedAt: Date | null;
  abortedAt: Date | null;
  winner: string | null;
}): GameStatus {
  if (game.abortedAt) return "aborted";
  if (game.winner) return "won";
  if (game.startedAt) return "playing";
  return "lobby";
}

export const GAME_STATUS_LABEL: Record<GameStatus, string> = {
  playing: "In progress",
  lobby: "In the lobby",
  won: "Finished",
  aborted: "Called off",
};

/** Order the "Your games" list is shown in: live games first, dead games last. */
export const GAME_STATUS_SORT_ORDER: Record<GameStatus, number> = {
  playing: 0,
  lobby: 1,
  won: 2,
  aborted: 3,
};
