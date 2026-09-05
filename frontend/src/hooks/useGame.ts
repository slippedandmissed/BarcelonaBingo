import { server } from "../utils/server";
import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useGameIds } from "./useGameIds";
import { useMemo } from "react";

export function useGame({ gameId }: { gameId: string }) {
  const queryClient = useQueryClient();

  const { invalidate: invalidateGameIds } = useGameIds();

  const { data } = useSuspenseQuery({
    queryKey: ["game", gameId],
    queryFn: () => server.api.games.game({ gameId }).get(),
  });
  const game = data.data!;

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["game", gameId] });
  }

  const startGame = useMutation({
    mutationFn: () => server.api.games.game({ gameId }).start.post(),
    onSuccess: () => {
      invalidate();
    },
  });

  const abortGame = useMutation({
    mutationFn: () => server.api.games.game({ gameId }).abort.post(),
    onSuccess: () => {
      invalidate();
    },
  });

  const leaveGame = useMutation({
    mutationFn: () => server.api.games.game({ gameId }).leave.post(),
    onSuccess: () => {
      invalidateGameIds();
    },
  });

  const kickPlayer = useMutation({
    mutationFn: ({ playerId }: { playerId: string }) =>
      server.api.games.game({ gameId }).kick.post({ playerId }),
    onSuccess: () => {
      invalidate();
    },
  });

  const isGameStarted = Boolean(game.startedAt);
  const {
    data: { data: promptsData },
  } = useSuspenseQuery({
    // `isGameStarted` is part of the key so the board is fetched as soon as the
    // game transitions from "lobby" to "in progress".
    queryKey: ["game", gameId, "prompts", isGameStarted],
    queryFn: async () =>
      isGameStarted ? await server.api.games.game({ gameId }).prompts.get() : { data: null },
  });
  const prompts = promptsData?.prompts ?? null;

  function invalidatePrompts() {
    queryClient.invalidateQueries({ queryKey: ["game", gameId, "prompts"] });
  }

  const markPromptAsCompleted = useMutation({
    mutationFn: ({ promptId, isCompleted }: { promptId: string; isCompleted: boolean }) =>
      server.api.games.game({ gameId }).prompts({ promptId }).completed.post({ isCompleted }),
    onSuccess: () => {
      invalidate();
    },
  });

  const regeneratePrompt = useMutation({
    mutationFn: ({ promptId }: { promptId: string }) =>
      server.api.games.game({ gameId }).prompts({ promptId }).regenerate.post(),
    onSuccess: () => {
      invalidatePrompts();
    },
  });

  const isAtLeastOneNonFreeSpacePromptCompleted = useMemo(
    () => prompts?.some((prompt) => prompt.completedAt && !prompt.isFreeSpace) ?? false,
    [prompts],
  );

  const boardSize = useMemo(
    () => ({
      rows: prompts ? Math.max(...prompts.map((prompt) => prompt.row)) + 1 : 0,
      columns: prompts ? Math.max(...prompts.map((prompt) => prompt.column)) + 1 : 0,
    }),
    [prompts],
  );

  const promptsById = useMemo(
    () =>
      prompts?.reduce(
        (acc, prompt) => {
          acc[prompt.id] = prompt;
          return acc;
        },
        {} as Record<string, (typeof prompts)[0]>,
      ) ?? {},
    [prompts],
  );

  const promptGrid = useMemo(() => {
    const grid: string[][] = Array.from({ length: boardSize.rows }, () =>
      Array.from({ length: boardSize.columns }, () => ""),
    );
    prompts?.forEach((prompt) => {
      grid[prompt.row][prompt.column] = prompt.id;
    });
    return grid;
  }, [prompts, boardSize]);

  return {
    game,
    invalidate,
    startGame,
    abortGame,
    leaveGame,
    kickPlayer,
    markPromptAsCompleted,
    regeneratePrompt,
    isAtLeastOneNonFreeSpacePromptCompleted,
    boardSize,
    promptsById,
    promptGrid,
  };
}
