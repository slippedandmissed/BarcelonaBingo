import { pgTable, uuid, text, timestamp, unique, integer, boolean } from "drizzle-orm/pg-core";
import { players } from "./player";

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  abortedAt: timestamp("aborted_at"),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
});

export type Game = typeof games.$inferSelect;

export const gameMemberships = pgTable(
  "game_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    isRemote: boolean("is_remote").notNull(),
  },
  (t) => [unique().on(t.gameId, t.playerId)],
);

export type GameMembership = typeof gameMemberships.$inferSelect;

export const boards = pgTable("boards", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  gameMembershipId: uuid("game_membership_id")
    .notNull()
    .references(() => gameMemberships.id, { onDelete: "cascade" }),
});

export type Board = typeof boards.$inferSelect;

export const prompts = pgTable(
  "prompts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    row: integer("row").notNull(),
    column: integer("column").notNull(),
    completedAt: timestamp("completed_at"),
    isFreeSpace: boolean("is_free_space").notNull().default(false),
  },
  (t) => [unique().on(t.boardId, t.row, t.column)],
);

export type Prompt = typeof prompts.$inferSelect;
