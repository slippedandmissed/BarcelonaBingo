import t from "typebox";
import Schema from "typebox/schema";
import { assertNever } from "./core/assertNever";
import { AnthropicAiDriver } from "./core/ai/anthropic";
import { MockAiDriver } from "./core/ai/mock";
import type { AiDriver } from "./core/ai";

const AiDriverEnv = t.Union([
  t.Object({
    AI_DRIVER: t.Literal("anthropic"),
    ANTHROPIC_API_KEY: t.String(),
  }),
  t.Object({
    AI_DRIVER: t.Literal("mock"),
  }),
]);

const Env = Schema.Compile(
  t.Intersect([
    t.Object({
      PORT: t.Optional(t.String()),
      ALLOWED_CORS_ORIGINS: t.String(),
      ALLOWED_REDIRECT_ORIGINS: t.String(),
      SERVER_SECURE: t.String(),
      POSTGRES_HOST: t.String(),
      POSTGRES_PORT: t.String(),
      POSTGRES_DB_NAME: t.String(),
      POSTGRES_USER: t.String(),
      POSTGRES_PASSWORD: t.String(),
      POSTGRES_SSL: t.String(),
      ANTHROPIC_API_KEY: t.String(),
    }),
    AiDriverEnv,
  ]),
);

function parseConfig() {
  const env = Env.Parse(process.env);
  return {
    server: {
      port: env.PORT ? parseInt(env.PORT, 10) : 80,
      allowedCorsOrigins: env.ALLOWED_CORS_ORIGINS.split(";"),
      allowedRedirectOrigins: env.ALLOWED_REDIRECT_ORIGINS.split(";"),
      secure: env.SERVER_SECURE === "true",
    },
    postgres: {
      host: env.POSTGRES_HOST,
      port: parseInt(env.POSTGRES_PORT, 10),
      dbName: env.POSTGRES_DB_NAME,
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      ssl: env.POSTGRES_SSL === "true",
    },
    ai: ((): AiDriver => {
      switch (env.AI_DRIVER) {
        case "anthropic":
          return new AnthropicAiDriver({ apiKey: env.ANTHROPIC_API_KEY });
        case "mock":
          return new MockAiDriver();
        default:
          assertNever(env);
      }
    })(),
  } as const;
}

export const config = parseConfig();
