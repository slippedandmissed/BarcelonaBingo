import { server } from "../utils/server";
import { useSuspenseQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useGameIds } from "./useGameIds";
import { useMemo } from "react";
import { getGameStatus } from "../utils/gameStatus";

// While challenges are generating in the background, poll for the game to
// flip to "playing" (or "generation_failed"). See core/game.ts#startGame on
// the backend for why start doesn't just block until this is done.
const GENERATING_POLL_INTERVAL_MS = 2000;

export function useGame({ gameId }: { gameId: string }) {
  const queryClient = useQueryClient();

  const { invalidate: invalidateGameIds } = useGameIds();

  const { data } = useSuspenseQuery({
    queryKey: ["game", gameId],
    queryFn: () => server.api.games.game({ gameId }).get(),
    refetchInterval: (query) => {
      const game = query.state.data?.data;
      if (!game) return false;
      return getGameStatus(game) === "generating" ? GENERATING_POLL_INTERVAL_MS : false;
    },
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

  // Boards populate in the background after start, so "started" isn't enough —
  // wait for `boardsReady` too, or the board would render before it has any
  // (non-free-space) squares.
  const isGameReady = getGameStatus(game) === "playing";
  const {
    data: { data: promptsData },
  } = useSuspenseQuery({
    // `isGameReady` is part of the key so the board is fetched as soon as the
    // game transitions to "playing".
    queryKey: ["game", gameId, "prompts", isGameReady],
    queryFn: async () =>
      isGameReady ? await server.api.games.game({ gameId }).prompts.get() : { data: null },
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
