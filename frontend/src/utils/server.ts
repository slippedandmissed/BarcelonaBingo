import { treaty } from "@elysia/eden";
import type { App } from "@barcelona-bingo/backend";

export const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;

export const server = treaty<App>(SERVER_URL, {
  fetch: {
    credentials: "include",
  },
  parseDate: true,
  throwHttpError: true,
});
