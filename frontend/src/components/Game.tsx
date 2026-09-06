import { useId, useMemo } from "react";
import { useGame } from "../hooks/useGame";
import { PlayerName } from "./PlayerName";
import { getUrlFromGameId } from "../utils/gameIdUrl";
import { BINGO_COLORS, BINGO_LETTERS } from "../utils/bingo";
import { getGameStatus, GAME_STATUS_LABEL } from "../utils/gameStatus";
import Markdown from "react-markdown";
import { Avatar, BingoBall, Button, Card, Confetti, CopyButton, ModalShell, Pill } from "./ui";

const MARKDOWN_INLINE = { p: "span" } as const;

export function Game({
  gameId,
  goBackToDashboard,
}: {
  gameId: string;
  goBackToDashboard: () => void;
}) {
  const { game } = useGame({ gameId });

  const status = getGameStatus(game);
  const statusLabel = GAME_STATUS_LABEL[status];

  return (
    <div className="space-y-6">
      <button
        onClick={goBackToDashboard}
        className="inline-flex items-center gap-1.5 font-heading text-sm font-semibold text-tinta-soft transition-colors hover:text-tinta"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none">
          <path
            d="M12 4 6 10l6 6"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        All games
      </button>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl text-tinta sm:text-4xl">{game.name}</h1>
            <div className="mt-2">
              <Pill tone={status}>{statusLabel}</Pill>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 rounded-2xl border-2 border-tinta bg-crema px-3 py-1.5">
              <span className="font-heading text-xs font-semibold uppercase tracking-wide text-tinta-soft">
                Code
              </span>
              <span className="font-display text-lg tracking-widest">{game.code}</span>
              <CopyButton value={game.code} label="" />
            </div>
            <a
              href={getUrlFromGameId(gameId)}
              target="_blank"
              rel="noreferrer"
              className="font-heading text-xs font-semibold text-mar-deep underline decoration-2 underline-offset-2 hover:text-mar"
            >
              Share invite link
            </a>
          </div>
        </div>
      </Card>

      {status === "lobby" ? (
        <NotYetStartedGame gameId={gameId} />
      ) : status === "generating" ? (
        <GeneratingGame gameId={gameId} />
      ) : status === "generation_failed" ? (
        <GenerationFailedGame gameId={gameId} />
      ) : status === "won" ? (
        <WonGame gameId={gameId} />
      ) : status === "aborted" ? (
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
    <Card className="p-6">
      <div className="rounded-2xl border-2 border-dashed border-tinta bg-crema p-6 text-center">
        <p className="font-heading text-sm font-semibold uppercase tracking-widest text-tinta-soft">
          Waiting for players
        </p>
        <p className="mt-3 break-all font-display text-3xl tracking-[0.15em] text-coral sm:text-4xl">
          {game.code}
        </p>
        <p className="mt-2 font-body text-sm text-tinta-soft">
          Share this code so friends can grab a card.
        </p>
        <div className="mt-4 flex justify-center">
          <CopyButton value={game.code} label="Copy code" />
        </div>
      </div>

      <h2 className="mt-6 font-display text-xl text-tinta">
        In the lobby{" "}
        <span className="font-heading text-base text-tinta-soft">({game.playerIds.length})</span>
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {game.playerIds.map((playerId) => (
          <li
            key={playerId}
            className="flex items-center gap-2 rounded-full border-2 border-tinta bg-white py-1 pl-1 pr-3 font-heading text-sm font-semibold shadow-hard-sm"
          >
            <PlayerAvatarName playerId={playerId} />
          </li>
        ))}
      </ul>

      <Button
        variant="mint"
        size="lg"
        className="mt-6 w-full"
        onClick={() => startGame.mutate()}
        disabled={startGame.isPending}
      >
        {startGame.isPending ? "Dealing cards…" : "Start game"}
      </Button>
    </Card>
  );
}

function GeneratingGame({ gameId }: { gameId: string }) {
  const { game } = useGame({ gameId });
  return (
    <Card className="p-10 text-center">
      <div className="flex justify-center">
        <BingoBall />
      </div>
      <p className="mt-4 font-display text-2xl text-tinta">Dealing everyone&apos;s cards…</p>
      <p className="mt-2 font-body text-sm text-tinta-soft">
        The AI is writing {game.playerIds.length} custom set
        {game.playerIds.length === 1 ? "" : "s"} of challenges. This can take a little while — feel
        free to leave this open, it&apos;ll update on its own.
      </p>
    </Card>
  );
}

function GenerationFailedGame({ gameId }: { gameId: string }) {
  const { startGame } = useGame({ gameId });
  return (
    <Card tone="cream" className="border-dashed p-10 text-center">
      <p className="font-display text-2xl text-coral-deep">Dealing cards failed</p>
      <p className="mt-2 font-body text-sm text-tinta-soft">
        Something went wrong generating one or more players' challenges. No harm done — you can try
        again.
      </p>
      <Button
        variant="mint"
        size="lg"
        className="mt-6"
        onClick={() => startGame.mutate()}
        disabled={startGame.isPending}
      >
        {startGame.isPending ? "Retrying…" : "Retry"}
      </Button>
    </Card>
  );
}

function WonGame({ gameId }: { gameId: string }) {
  const { game } = useGame({ gameId });
  return (
    <>
      <Confetti />
      <Card className="overflow-hidden">
        <div className="border-b-2 border-tinta bg-sol px-6 py-8 text-center">
          <p className="font-display text-5xl text-tinta sm:text-6xl">BINGO!</p>
          <p className="mt-3 font-heading text-lg font-semibold text-tinta">
            <PlayerName playerId={game.winner!} /> filled their card first 🎉
          </p>
        </div>
        <div className="p-5">
          <GameBoard gameId={gameId} readOnly />
        </div>
      </Card>
    </>
  );
}

function AbortedGame({ gameId }: { gameId: string }) {
  const { game } = useGame({ gameId });
  return (
    <Card tone="cream" className="border-dashed p-10 text-center">
      <p className="font-display text-3xl text-tinta-soft">Game called off</p>
      <p className="mt-2 font-body text-sm text-tinta-soft">
        {game.name} was aborted before anyone won.
      </p>
    </Card>
  );
}

function InProgressGame({ gameId }: { gameId: string }) {
  const { game, abortGame, promptsById } = useGame({ gameId });

  const { done, total } = useMemo(() => {
    const cells = Object.values(promptsById).filter((p) => !p.isFreeSpace);
    return {
      done: cells.filter((p) => p.completedAt).length,
      total: cells.length,
    };
  }, [promptsById]);

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-heading text-sm font-semibold text-tinta-soft">
            {done} of {total} squares dabbed
          </p>
          <div className="mt-1.5 h-2.5 w-40 overflow-hidden rounded-full border-2 border-tinta bg-crema">
            <div
              className="h-full rounded-full bg-menta transition-all duration-500"
              style={{ width: `${total ? (done / total) * 100 : 0}%` }}
            />
          </div>
        </div>
        <span className="font-body text-xs text-tinta-soft">{game.playerIds.length} playing</span>
      </div>

      <GameBoard gameId={gameId} />

      <div className="mt-5 flex justify-center">
        <Button
          variant="danger"
          size="sm"
          onClick={() => abortGame.mutate()}
          disabled={abortGame.isPending}
        >
          Abort game
        </Button>
      </div>
    </Card>
  );
}

function PlayerAvatarName({ playerId }: { playerId: string }) {
  return (
    <PlayerName playerId={playerId}>
      {(name) => (
        <>
          <Avatar name={name} size="sm" />
          <span className="max-w-[9rem] truncate">{name}</span>
        </>
      )}
    </PlayerName>
  );
}

function GameBoard({ gameId, readOnly = false }: { gameId: string; readOnly?: boolean }) {
  const { promptGrid } = useGame({ gameId });
  return (
    <div className="mx-auto max-w-md">
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        {BINGO_LETTERS.map((letter, i) => (
          <div
            key={letter}
            className={`grid place-items-center rounded-xl border-2 border-tinta py-1.5 font-display text-xl text-white shadow-hard-sm sm:text-2xl ${BINGO_COLORS[i]}`}
          >
            {letter}
          </div>
        ))}
        {promptGrid.map((row, rowIndex) =>
          row.map((promptId, columnIndex) => (
            <PromptCell
              key={`${rowIndex}-${columnIndex}`}
              gameId={gameId}
              promptId={promptId}
              readOnly={readOnly}
            />
          )),
        )}
      </div>
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
  } = useGame({ gameId });
  const prompt = promptsById[promptId]!;
  const modalId = useId();

  const isDone = Boolean(prompt.completedAt);

  if (prompt.isFreeSpace) {
    return (
      <div className="relative grid aspect-square place-items-center rounded-xl border-2 border-tinta bg-sol p-1 text-center shadow-hard-sm">
        <span className="text-2xl">★</span>
        <span className="absolute bottom-1 font-display text-[9px] uppercase tracking-wide">
          Free
        </span>
      </div>
    );
  }

  return (
    <>
      <button
        // @ts-expect-error - invoker commands API
        command="show-modal"
        commandfor={modalId}
        disabled={readOnly}
        className={`relative grid aspect-square place-items-center overflow-hidden rounded-xl border-2 border-tinta p-1.5 text-center font-body text-[10px] leading-tight transition-all sm:text-[11px] ${
          isDone ? "bg-menta/15 text-tinta" : "bg-white text-tinta"
        } ${
          readOnly
            ? ""
            : "cursor-pointer hover:-translate-y-0.5 hover:shadow-hard-sm active:translate-y-0"
        }`}
      >
        <span className="line-clamp-4 [&_*]:m-0">
          <Markdown components={MARKDOWN_INLINE}>{prompt.text}</Markdown>
        </span>
        {isDone && (
          <span
            className="pointer-events-none absolute inset-1.5 grid place-items-center rounded-full border-[3px] border-coral/70 bg-coral/25"
            style={{ animation: "stamp-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6 text-coral-deep" fill="none">
              <path
                d="m4 13 5 5L20 6"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}
      </button>

      <dialog id={modalId}>
        <ModalShell
          title={isDone ? "Dabbed" : "Challenge"}
          modalId={modalId}
          accent={isDone ? "bg-menta" : "bg-sol"}
        >
          <div className="rounded-2xl border-2 border-tinta bg-crema p-4 font-body text-base [&_a]:text-mar-deep [&_a]:underline [&_p]:m-0">
            <Markdown>{prompt.text}</Markdown>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Button
              // @ts-expect-error - invoker commands API
              command="close"
              commandfor={modalId}
              variant={isDone ? "ghost" : "mint"}
              className="w-full"
              onClick={() =>
                markPromptAsCompleted.mutate({
                  promptId,
                  isCompleted: !prompt.completedAt,
                })
              }
              disabled={markPromptAsCompleted.isPending}
            >
              {isDone ? "Un-dab this square" : "Dab this square"}
            </Button>

            {!isDone && (
              <button
                // @ts-expect-error - invoker commands API
                command="close"
                commandfor={modalId}
                onClick={() => regeneratePrompt.mutate({ promptId })}
                disabled={!isAtLeastOneNonFreeSpacePromptCompleted || regeneratePrompt.isPending}
                className="rounded-2xl border-2 border-dashed border-tinta bg-white px-4 py-2.5 font-body text-xs text-tinta-soft transition-colors hover:bg-crema disabled:opacity-45"
              >
                <span className="font-heading font-semibold text-coral-deep">
                  Swap this challenge
                </span>
                <br />
                Costs you one random square you&apos;ve already dabbed.
              </button>
            )}
          </div>
        </ModalShell>
      </dialog>
    </>
  );
}
