import { db, type Transactable } from "../db/db";
import { players, type Player } from "../db/schema";
import { generateRandomCode } from "./code";
import { eq } from "drizzle-orm";

export async function createPlayer({
  name,
  tx = db,
}: {
  name: string;
  tx?: Transactable;
}): Promise<Player> {
  return (await tx.insert(players).values({ name, code: generateRandomCode() }).returning())[0]!;
}

export async function getPlayerById({
  id,
  tx = db,
}: {
  id: string;
  tx?: Transactable;
}): Promise<Player | null> {
  const player = await tx.select().from(players).where(eq(players.id, id)).limit(1);

  if (player.length === 0) {
    return null;
  }

  return player[0]!;
}

export async function getPlayerByCode({
  code,
  tx = db,
}: {
  code: string;
  tx?: Transactable;
}): Promise<Player | null> {
  const player = await tx.select().from(players).where(eq(players.code, code)).limit(1);

  if (player.length === 0) {
    return null;
  }

  return player[0]!;
}

export async function updatePlayer({
  player,
  name,
  tx = db,
}: {
  player: Player;
  name?: string;
  tx?: Transactable;
}): Promise<Player> {
  return (await tx.update(players).set({ name }).where(eq(players.id, player.id)).returning())[0]!;
}
