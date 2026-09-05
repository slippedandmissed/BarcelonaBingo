import { useId } from "react";
import { useGame } from "../hooks/useGame";
import { PlayerName } from "./PlayerName";
import { faX, faCheck } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getUrlFromGameId } from "../utils/gameIdUrl";
import Markdown from "react-markdown";

export function Game({
  gameId,
  goBackToDashboard,
}: {
  gameId: string;
  goBackToDashboard: () => void;
}) {
  const { game } = useGame({ gameId });

  return (
    <div className="flex flex-col">
      <div className="flex space-between">
        <h2>{game.name}</h2>
        <span>Code: {game.code}</span>
        <a href={getUrlFromGameId(gameId)} target="_blank">
          URL: {getUrlFromGameId(gameId)}
        </a>
        <button onClick={goBackToDashboard}>Back to Dashboard</button>
      </div>
      {!game.startedAt ? (
        <NotYetStartedGame gameId={gameId} />
      ) : game.winner ? (
        <WonGame gameId={gameId} />
      ) : game.abortedAt ? (
        <AbortedGame gameId={gameId} />
      ) : (
        <InProgressGame gameId={gameId} />
      )}
    </div>
  );
}

function NotYetStartedGame({ gameId }: { gameId: string }) {
  const { game, startGame } = useGame({ gameId });
  return (
    <div>
      <h2>{game.name} has not yet started</h2>
      <div>Players:</div>
      <ul>
        {game.playerIds.map((playerId) => (
          <li key={playerId}>
            <PlayerName playerId={playerId} />
          </li>
        ))}
      </ul>
      <button onClick={() => startGame.mutate()} disabled={startGame.isPending}>
        Start Game
      </button>
    </div>
  );
}

function WonGame({ gameId }: { gameId: string }) {
  const { game } = useGame({ gameId });
  return (
    <div>
      <h2>
        {game.name} has been won by <PlayerName playerId={game.winner!} />
      </h2>
      <GameBoard gameId={gameId} readOnly />
    </div>
  );
}

function AbortedGame({ gameId }: { gameId: string }) {
  const { game } = useGame({ gameId });
  return (
    <div>
      <h2>{game.name} has been aborted</h2>
    </div>
  );
}

function InProgressGame({ gameId }: { gameId: string }) {
  const { game, abortGame } = useGame({ gameId });
  return (
    <div>
      <h2>{game.name} is in progress</h2>
      <GameBoard gameId={gameId} />
      <button onClick={() => abortGame.mutate()} disabled={abortGame.isPending}>
        Abort Game
      </button>
    </div>
  );
}

function GameBoard({ gameId, readOnly = false }: { gameId: string; readOnly?: boolean }) {
  const { promptGrid } = useGame({ gameId });
  return (
    <div>
      {promptGrid.map((row, rowIndex) => (
        <div key={rowIndex} className="flex">
          {row.map((promptId, columnIndex) => (
            <div key={columnIndex} className="border p-2">
              <PromptCell gameId={gameId} promptId={promptId} readOnly={readOnly} />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function PromptCell({
  gameId,
  promptId,
  readOnly = false,
}: {
  gameId: string;
  promptId: string;
  readOnly?: boolean;
}) {
  const {
    promptsById,
    markPromptAsCompleted,
    isAtLeastOneNonFreeSpacePromptCompleted,
    regeneratePrompt,
  } = useGame({ gameId: gameId });
  const prompt = promptsById[promptId]!;
  const modalId = useId();
  return (
    <>
      <button
        // @ts-expect-error
        command="show-modal"
        commandfor={modalId}
        disabled={readOnly || prompt.isFreeSpace}
      >
        {prompt.completedAt && <FontAwesomeIcon icon={faCheck} />}
        <Markdown>{prompt.text}</Markdown>
      </button>
      <dialog id={modalId} className="modal">
        <button
          // @ts-expect-error
          command="close"
          commandfor={modalId}
        >
          <FontAwesomeIcon icon={faX} />
        </button>

        <Markdown>{prompt.text}</Markdown>
        <button
          // @ts-expect-error
          command="close"
          commandfor={modalId}
          onClick={() =>
            markPromptAsCompleted.mutate({
              promptId,
              isCompleted: !prompt.completedAt,
            })
          }
          disabled={markPromptAsCompleted.isPending}
        >
          {prompt.completedAt ? "Mark as Incomplete" : "Mark as Completed"}
        </button>
        {!prompt.completedAt && (
          <button
            // @ts-expect-error
            command="close"
            commandfor={modalId}
            onClick={() => {
              regeneratePrompt.mutate({ promptId });
            }}
            disabled={!isAtLeastOneNonFreeSpacePromptCompleted || regeneratePrompt.isPending}
          >
            Regenerate prompt. This will come at the cost of a random one you&apos;ve already
            completed
          </button>
        )}
      </dialog>
    </>
  );
}
