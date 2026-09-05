import { Suspense, useState, useEffect, type Dispatch, type SetStateAction } from "react";
import { Header } from "./Header";
import { Game } from "../../components/Game";
import { useGameIds } from "../../hooks/useGameIds";
import { useGame } from "../../hooks/useGame";
import { GAME_ID_QUERY_PARAM } from "../../utils/gameIdUrl";

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
      <main>
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
    <div>
      <CreateGameForm setCurrentGameId={setCurrentGameId} />
      <hr />
      <JoinGameForm setCurrentGameId={setCurrentGameId} />
      <hr />
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
  return (
    <div>
      <h2>My games</h2>
      {gameIds.length ? (
        gameIds.map((gameId) => (
          <button key={gameId} onClick={() => setCurrentGameId(gameId)}>
            <Suspense fallback={<>Loading...</>}>
              <MyGameButtonContent gameId={gameId} />
            </Suspense>
          </button>
        ))
      ) : (
        <div>You haven't joined any games</div>
      )}
    </div>
  );
}

function MyGameButtonContent({ gameId }: { gameId: string }) {
  const { game } = useGame({ gameId });
  return <>{game.name}</>;
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
    <div>
      <h2>Create a game</h2>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Enter game name"
      />
      <label>
        <input
          type="checkbox"
          checked={isHostRemote}
          onChange={(e) => setIsHostRemote(e.target.checked)}
        />
        I'm hosting remotely
      </label>
      <button
        onClick={() =>
          createGame
            .mutateAsync({ name, isHostRemote })
            .then((response) => setCurrentGameId(response.data!.gameId))
        }
      >
        Create Game
      </button>
    </div>
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
    <div>
      <h2>Join a game</h2>
      <input
        type="text"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter game code"
      />
      <label>
        <input type="checkbox" checked={isRemote} onChange={(e) => setIsRemote(e.target.checked)} />
        I'm joining remotely
      </label>
      <button
        onClick={() =>
          joinGame
            .mutateAsync({ gameCode: code, isRemote })
            .then((response) => setCurrentGameId(response.data!.gameId))
        }
      >
        Join Game
      </button>
    </div>
  );
}
