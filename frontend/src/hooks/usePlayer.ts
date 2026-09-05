import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { server } from "../utils/server";

export function usePlayer({ playerId }: { playerId: string }) {
  const queryClient = useQueryClient();
  const {
    data: { data: player },
  } = useSuspenseQuery({
    queryKey: ["player", playerId],
    queryFn: () => server.api.player({ playerId }).get(),
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["player", playerId] });
  }

  return { player: player!, invalidate };
}
