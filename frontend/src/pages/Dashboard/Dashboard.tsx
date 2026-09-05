import { useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { useSuspenseQueries } from "@tanstack/react-query";
import { Header } from "./Header";
import { Game } from "../../components/Game";
import { useGameIds } from "../../hooks/useGameIds";
import { useGame } from "../../hooks/useGame";
import { GAME_ID_QUERY_PARAM } from "../../utils/gameIdUrl";
import {
  getGameStatus,
  GAME_STATUS_LABEL,
  GAME_STATUS_SORT_ORDER,
  type GameStatus,
} from "../../utils/gameStatus";
import { server } from "../../utils/server";
import { Button, Card, Checkbox, Pill, TextInput } from "../../components/ui";

type GameSummary = ReturnType<typeof useGame>["game"];

export function Dashboard() {
  const [currentGameId, setCurrentGameId] = useState<string | null>(
    new URLSearchParams(window.location.search).get(GAME_ID_QUERY_PARAM),
  );

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (currentGameId) {
      searchParams.set(GAME_ID_QUERY_PARAM, currentGameId);
    } else {
      searchParams.delete(GAME_ID_QUERY_PARAM);
    }
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.replaceState(null, "", newUrl);
  }, [currentGameId]);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-8">
        {currentGameId ? (
          <Game gameId={currentGameId} goBackToDashboard={() => setCurrentGameId(null)} />
        ) : (
          <NotInGameView setCurrentGameId={setCurrentGameId} />
        )}
      </main>
    </>
  );
}

function NotInGameView({
  setCurrentGameId,
}: {
  setCurrentGameId: Dispatch<SetStateAction<string | null>>;
}) {
  return (
    <div className="space-y-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <CreateGameForm setCurrentGameId={setCurrentGameId} />
        <JoinGameForm setCurrentGameId={setCurrentGameId} />
      </div>
      <MyGames setCurrentGameId={setCurrentGameId} />
    </div>
  );
}

function MyGames({
  setCurrentGameId,
}: {
  setCurrentGameId: Dispatch<SetStateAction<string | null>>;
}) {
  const { gameIds } = useGameIds();

  // Load every game so the list can be ordered by status on the client. The
  // player is only ever in a handful of games, so this stays cheap. These share
  // a query key with `useGame`, so opening a game is an instant cache hit.
  const results = useSuspenseQueries({
    queries: gameIds.map((gameId) => ({
      queryKey: ["game", gameId],
      queryFn: () => server.api.games.game({ gameId }).get(),
    })),
  });

  const games = gameIds
    .map((gameId, i) => {
      const game = results[i]!.data.data!;
      return { gameId, game, status: getGameStatus(game) };
    })
    .sort((a, b) => GAME_STATUS_SORT_ORDER[a.status] - GAME_STATUS_SORT_ORDER[b.status]);

  return (
    <section>
      <h2 className="font-display text-2xl text-tinta">Your games</h2>
      {games.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {games.map(({ gameId, game, status }) => (
            <button
              key={gameId}
              onClick={() => setCurrentGameId(gameId)}
              className="group rounded-2xl border-2 border-tinta bg-white p-4 text-left shadow-hard transition-all hover:-translate-y-1 hover:shadow-hard-lg active:translate-y-0 active:shadow-hard-sm"
            >
              <MyGameCard game={game} status={status} />
            </button>
          ))}
        </div>
      ) : (
        <Card tone="cream" className="mt-4 border-dashed p-8 text-center">
          <p className="font-heading text-lg font-semibold">No games yet</p>
          <p className="mt-1 font-body text-sm text-tinta-soft">
            Create one below, or join with a friend&apos;s code.
          </p>
        </Card>
      )}
    </section>
  );
}

function MyGameCard({ game, status }: { game: GameSummary; status: GameStatus }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-heading text-lg font-semibold text-tinta group-hover:text-coral">
          {game.name}
        </p>
        <p className="mt-1 font-body text-sm text-tinta-soft">
          {game.playerIds.length} player{game.playerIds.length === 1 ? "" : "s"} · code{" "}
          <span className="font-mono">{game.code}</span>
        </p>
      </div>
      <Pill tone={status}>{GAME_STATUS_LABEL[status]}</Pill>
    </div>
  );
}

function CreateGameForm({
  setCurrentGameId,
}: {
  setCurrentGameId: Dispatch<SetStateAction<string | null>>;
}) {
  const [name, setName] = useState("");
  const [isHostRemote, setIsHostRemote] = useState(false);
  const { createGame } = useGameIds();

  return (
    <Card className="flex flex-col p-5">
      <h2 className="font-display text-xl text-coral">Start a game</h2>
      <p className="mt-1 font-body text-sm text-tinta-soft">
        You&apos;ll be the host and can kick things off once everyone&apos;s in.
      </p>
      <form
        className="mt-4 flex flex-1 flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          void createGame
            .mutateAsync({ name: name.trim(), isHostRemote })
            .then((response) => setCurrentGameId(response.data!.gameId));
        }}
      >
        <TextInput
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Game name (e.g. Costa Brava Cup)"
        />
        <Checkbox checked={isHostRemote} onChange={setIsHostRemote}>
          I&apos;m hosting remotely
        </Checkbox>
        <Button
          type="submit"
          variant="coral"
          className="mt-auto w-full"
          disabled={createGame.isPending || !name.trim()}
        >
          {createGame.isPending ? "Creating…" : "Create game"}
        </Button>
      </form>
    </Card>
  );
}

function JoinGameForm({
  setCurrentGameId,
}: {
  setCurrentGameId: Dispatch<SetStateAction<string | null>>;
}) {
  const [code, setCode] = useState("");
  const [isRemote, setIsRemote] = useState(false);
  const { joinGame } = useGameIds();

  return (
    <Card className="flex flex-col p-5">
      <h2 className="font-display text-xl text-mar">Join a game</h2>
      <p className="mt-1 font-body text-sm text-tinta-soft">
        Got a code from the host? Drop it in here.
      </p>
      <form
        className="mt-4 flex flex-1 flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!code.trim()) return;
          void joinGame
            .mutateAsync({ gameCode: code.trim(), isRemote })
            .then((response) => setCurrentGameId(response.data!.gameId));
        }}
      >
        <TextInput
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Game code"
          className="font-mono tracking-widest uppercase"
        />
        <Checkbox checked={isRemote} onChange={setIsRemote}>
          I&apos;m joining remotely
        </Checkbox>
        <Button
          type="submit"
          variant="sea"
          className="mt-auto w-full"
          disabled={joinGame.isPending || !code.trim()}
        >
          {joinGame.isPending ? "Joining…" : "Join game"}
        </Button>
      </form>
    </Card>
  );
}
