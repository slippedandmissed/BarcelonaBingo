export const GAME_ID_QUERY_PARAM = "g" as const;

export function getUrlFromGameId(gameId: string) {
  const url = new URL(window.location.origin);
  url.searchParams.set(GAME_ID_QUERY_PARAM, gameId);
  return url.toString();
}
