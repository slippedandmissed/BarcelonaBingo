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
    queryClient.invalidateQueries({ queryKey: ["games"] });
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

  return { gameIds: games!.gameIds, createGame, joinGame, invalidate };
}
