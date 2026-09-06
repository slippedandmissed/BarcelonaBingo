import { db, type Transactable } from "../db/db";
import {
  boards,
  cachedPrompts,
  gameMemberships,
  prompts,
  type Board,
  type GameMembership,
  type Player,
  type Prompt,
} from "../db/schema";
import { and, eq, not, isNotNull } from "drizzle-orm";
import { getPlayerById } from "./player";
import { BOARD_HEIGHT, BOARD_WIDTH } from "./board";
import { HttpError } from "./errors/http_error";
import path from "path";
import { config } from "../config";

export async function markPromptAsCompleted({
  prompt,
  isCompleted,
  tx = db,
}: {
  prompt: Prompt;
  isCompleted: boolean;
  tx?: Transactable;
}): Promise<void> {
  return await tx.transaction(async (tx) => {
    await tx
      .update(prompts)
      .set({ completedAt: isCompleted ? new Date() : null })
      .where(and(eq(prompts.id, prompt.id)));
  });
}

export async function getPromptById({
  id,
  player,
  tx = db,
}: {
  id: string;
  player: Player;
  tx?: Transactable;
}): Promise<Prompt | null> {
  return (
    (
      await tx
        .select()
        .from(prompts)
        .innerJoin(boards, eq(prompts.boardId, boards.id))
        .innerJoin(gameMemberships, eq(boards.gameMembershipId, gameMemberships.id))
        .where(and(eq(prompts.id, id), eq(gameMemberships.playerId, player.id)))
    )[0]?.prompts ?? null
  );
}

async function getPlayerByBoard({
  board,
  tx = db,
}: {
  board: Board;
  tx?: Transactable;
}): Promise<Player> {
  return await tx.transaction(async (tx) => {
    const membership = await getGameMembershipByBoard({ board, tx });
    return (await getPlayerById({ id: membership.playerId, tx }))!;
  });
}

async function getOtherPlayersByBoard({
  board,
  tx = db,
}: {
  board: Board;
  tx?: Transactable;
}): Promise<{ player: Player; isRemote: boolean }[]> {
  return await tx.transaction(async (tx) => {
    const membership = await getGameMembershipByBoard({ board, tx });
    const otherMemberships = await tx
      .select()
      .from(gameMemberships)
      .where(
        and(
          eq(gameMemberships.gameId, membership.gameId),
          not(eq(gameMemberships.id, membership.id)),
        ),
      );
    const otherPlayers = await Promise.all(
      otherMemberships.map((m) => getPlayerById({ id: m.playerId, tx })),
    );
    return otherPlayers
      .filter((p): p is Player => p !== null)
      .map((p) => ({
        player: p,
        isRemote: otherMemberships.find((m) => m.playerId === p.id)!.isRemote,
      }));
  });
}

function getValidityFingerprint({
  player,
  isRemote,
  otherPlayers,
}: {
  player: Player;
  isRemote: boolean;
  otherPlayers: {
    player: Player;
    isRemote: boolean;
  }[];
}): string {
  return [player.id, isRemote, ...otherPlayers.flatMap((p) => [p.player.id, p.isRemote])].join(",");
}

type OtherPlayer = { player: Player; isRemote: boolean };

let cachedSystemPrompt: string | null = null;

/** The static persona / style / rules. Identical for every request. */
async function challengeSystemPrompt(): Promise<string> {
  cachedSystemPrompt ??= await Bun.file(
    path.join(__dirname, "..", "..", "assets", "challenge_system_prompt.md"),
  ).text();
  return cachedSystemPrompt;
}

/** The request specific to one player and the current roster. */
function buildChallengeUserPrompt({
  player,
  isRemote,
  otherPlayers,
  batchSize,
}: {
  player: Player;
  isRemote: boolean;
  otherPlayers: OtherPlayer[];
  batchSize: number;
}): string {
  const roster = otherPlayers
    .map((other) => `- ${other.player.name} (${other.isRemote ? "remote" : "in person"})`)
    .join("\n");
  const anyRemoteTargets = otherPlayers.some((other) => other.isRemote);

  const lines = [
    `Write ${batchSize} challenges for ${player.name}, who is playing ${
      isRemote ? "REMOTELY" : "IN PERSON"
    }.`,
    "",
    "The other players are:",
    roster || "- (nobody else yet)",
    "",
    "For this batch specifically:",
    `- Every challenge is something ${player.name} gets one of the other players to do or say. Never make ${player.name} the mark.`,
  ];

  if (isRemote) {
    lines.push(
      `- ${player.name} is remote, so every challenge must work over the group chat, DMs, or a voice/video call. No physical actions.`,
    );
  } else if (anyRemoteTargets) {
    lines.push(
      "- Physical challenges are fine, but any challenge that names or could involve a remote player must also work over text or a call.",
    );
  }

  lines.push(
    '- Vary the mark: mostly "another player", name a specific player for some, and offer a choice of two named players for a few. Spread the names around.',
  );

  return lines.join("\n");
}

async function generateManyPromptTexts({
  player,
  isRemote,
  otherPlayers,
  batchSize,
}: {
  player: Player;
  isRemote: boolean;
  otherPlayers: OtherPlayer[];
  batchSize: number;
}): Promise<string[]> {
  return config.ai.generateChallenges({
    system: await challengeSystemPrompt(),
    user: buildChallengeUserPrompt({ player, isRemote, otherPlayers, batchSize }),
    count: batchSize,
  });
}

async function getAndDeleteCachedPromptText({
  player,
  isRemote,
  otherPlayers,
  tx = db,
}: {
  player: Player;
  isRemote: boolean;
  otherPlayers: {
    player: Player;
    isRemote: boolean;
  }[];
  tx?: Transactable;
}): Promise<string | null> {
  return await tx.transaction(async (tx) => {
    const fingerprint = getValidityFingerprint({
      player,
      isRemote,
      otherPlayers,
    });
    return await tx
      .select()
      .from(cachedPrompts)
      .where(eq(cachedPrompts.validityFingerprint, fingerprint))
      .then(async (rows) => {
        if (rows[0]) {
          await tx.delete(cachedPrompts).where(eq(cachedPrompts.id, rows[0].id));
          return rows[0].text;
        }
        return null;
      });
  });
}

async function populatePromptCache({
  player,
  isRemote,
  otherPlayers,
  batchSize,
  tx = db,
}: {
  player: Player;
  isRemote: boolean;
  otherPlayers: {
    player: Player;
    isRemote: boolean;
  }[];
  batchSize: number;
  tx?: Transactable;
}): Promise<void> {
  const texts = await generateManyPromptTexts({
    batchSize,
    player,
    isRemote,
    otherPlayers,
  });
  const fingerprint = getValidityFingerprint({
    player,
    isRemote,
    otherPlayers,
  });
  await tx.insert(cachedPrompts).values(
    texts.map((text) => ({
      validityFingerprint: fingerprint,
      text,
    })),
  );
}

async function generatePromptText({
  tx = db,
  ...rest
}: {
  player: Player;
  isRemote: boolean;
  otherPlayers: {
    player: Player;
    isRemote: boolean;
  }[];
  tx?: Transactable;
}): Promise<string> {
  return await tx.transaction(async (tx) => {
    const cached = await getAndDeleteCachedPromptText({ tx, ...rest });
    if (cached) {
      return cached;
    }
    // Right-sized to exactly what one board needs (every cell but the free
    // space), so a fresh board's generation asks the AI for only as many
    // challenges as it will actually use. A swap empties the cache again
    // later and refills at the same size.
    const hasFreeSpace = BOARD_WIDTH % 2 === 1 && BOARD_HEIGHT % 2 === 1;
    await populatePromptCache({
      tx,
      ...rest,
      batchSize: BOARD_WIDTH * BOARD_HEIGHT - (hasFreeSpace ? 1 : 0),
    });
    return (await getAndDeleteCachedPromptText({ tx, ...rest }))!;
  });
}

async function getGameMembershipByBoard({
  board,
  tx = db,
}: {
  board: Board;
  tx?: Transactable;
}): Promise<GameMembership> {
  return (
    await tx.select().from(gameMemberships).where(eq(gameMemberships.id, board.gameMembershipId))
  )[0]!;
}

export type PromptGenerationContext = {
  player: Player;
  isRemote: boolean;
  otherPlayers: { player: Player; isRemote: boolean }[];
};

/**
 * Everything `createPrompt` needs to generate a non-free-space challenge for
 * this board. Fetch it once and pass it to every `createPrompt` call when
 * populating a whole board, instead of each of the ~24 cells re-querying the
 * player and roster for itself.
 */
export async function getPromptGenerationContextForBoard({
  board,
  tx = db,
}: {
  board: Board;
  tx?: Transactable;
}): Promise<PromptGenerationContext> {
  return await tx.transaction(async (tx) => {
    const player = await getPlayerByBoard({ board, tx });
    const membership = await getGameMembershipByBoard({ board, tx });
    const otherPlayers = await getOtherPlayersByBoard({ board, tx });
    return { player, isRemote: membership.isRemote, otherPlayers };
  });
}

export async function createPrompt({
  board,
  row,
  column,
  context,
  tx = db,
}: {
  board: Board;
  row: number;
  column: number;
  /** Reuse a context from `getPromptGenerationContextForBoard` instead of
   *  looking the player/roster up again — pass it when creating several
   *  cells for the same board back-to-back. */
  context?: PromptGenerationContext;
  tx?: Transactable;
}): Promise<void> {
  return await tx.transaction(async (tx) => {
    if (
      BOARD_WIDTH % 2 === 1 &&
      BOARD_HEIGHT % 2 === 1 &&
      row === Math.floor(BOARD_HEIGHT / 2) &&
      column === Math.floor(BOARD_WIDTH / 2)
    ) {
      await tx.insert(prompts).values({
        text: "Free Space",
        row,
        column,
        boardId: board.id,
        completedAt: new Date(),
        isFreeSpace: true,
      });
    } else {
      const { player, isRemote, otherPlayers } =
        context ?? (await getPromptGenerationContextForBoard({ board, tx }));
      await tx.insert(prompts).values({
        text: await generatePromptText({
          player,
          isRemote,
          otherPlayers,
          tx,
        }),
        row,
        column,
        boardId: board.id,
      });
    }
  });
}

async function getCompletedNonFreeSpacePrompts({
  board,
  tx = db,
}: {
  board: Board;
  tx?: Transactable;
}): Promise<Prompt[]> {
  return await tx
    .select()
    .from(prompts)
    .where(
      and(
        eq(prompts.boardId, board.id),
        isNotNull(prompts.completedAt),
        eq(prompts.isFreeSpace, false),
      ),
    );
}

export async function getRandomCompletedNonFreeSpacePrompt({
  board,
  tx = db,
}: {
  board: Board;
  tx?: Transactable;
}): Promise<Prompt | null> {
  const completedPrompts = await getCompletedNonFreeSpacePrompts({ board, tx });
  if (completedPrompts.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * completedPrompts.length);
  return completedPrompts[randomIndex]!;
}

export async function regeneratePrompt({
  prompt,
  tx = db,
}: {
  prompt: Prompt;
  tx?: Transactable;
}): Promise<void> {
  return await tx.transaction(async (tx) => {
    if (prompt.isFreeSpace) {
      throw new HttpError(400, "Cannot regenerate a free space prompt");
    }
    const board = (await tx.select().from(boards).where(eq(boards.id, prompt.boardId)))[0]!;
    const player = await getPlayerByBoard({ board, tx });
    const otherPlayers = await getOtherPlayersByBoard({ board, tx });
    const membership = await getGameMembershipByBoard({ board, tx });
    await tx
      .update(prompts)
      .set({
        text: await generatePromptText({
          player,
          isRemote: membership.isRemote,
          otherPlayers,
          tx,
        }),
      })
      .where(eq(prompts.id, prompt.id));
  });
}
