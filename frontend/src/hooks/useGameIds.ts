import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { server } from "../utils/server";

export function useGameIds() {
  const queryClient = useQueryClient();
  const {
    data: { data: games },
  } = useSuspenseQuery({
    queryKey: ["games"],
    queryFn: () => server.api.games.get(),
  });
  function invalidate() {
    return queryClient.invalidateQueries({ queryKey: ["games"] });
  }

  // For a manual refresh: also re-fetches every game already loaded into the
  // list (each `["game", id]` entry), not just the id list itself — there are
  // no websockets, so this is how a stale "in the lobby" / player count on
  // the dashboard catches up.
  function refresh() {
    return Promise.all([
      queryClient.invalidateQueries({ queryKey: ["games"] }),
      queryClient.invalidateQueries({ queryKey: ["game"] }),
    ]);
  }

  const createGame = useMutation({
    mutationFn: (data: { name: string; isHostRemote: boolean }) => server.api.games.post(data),
    onSuccess: () => {
      invalidate();
    },
  });

  const joinGame = useMutation({
    mutationFn: (data: { gameCode: string; isRemote: boolean }) => server.api.games.join.post(data),
    onSuccess: () => {
      invalidate();
    },
  });

  return { gameIds: games!.gameIds, createGame, joinGame, invalidate, refresh };
}
