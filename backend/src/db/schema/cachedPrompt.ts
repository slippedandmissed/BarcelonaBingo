import { pgTable, text, uuid } from "drizzle-orm/pg-core";

export const cachedPrompts = pgTable("cached_prompts", {
  id: uuid("id").primaryKey().defaultRandom(),
  validityFingerprint: text("validity_fingerprint").notNull(),
  text: text("text").notNull(),
});
