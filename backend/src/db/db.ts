import { drizzle } from "drizzle-orm/postgres-js";
import { config } from "../config";
import postgres from "postgres";

const queryClient = postgres({
  host: config.postgres.host,
  port: config.postgres.port,
  username: config.postgres.user,
  password: config.postgres.password,
  database: config.postgres.dbName,
  ssl: config.postgres.ssl,
  idle_timeout: 120,
});

export const db = drizzle(queryClient);

export type Transactable = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];
