import { Elysia } from "elysia";
import cors from "@elysiajs/cors";
import { config } from "./config";
import api from "./api";
import { errorHandler } from "./core/errors/error_handler";

const app = new Elysia()
  .use(cors({ origin: config.server.allowedCorsOrigins }))
  .use(errorHandler)
  .use(api)
  .listen(config.server.port);
export type App = typeof app;

console.log(`Listening on ${app.server?.hostname}:${app.server?.port}`);
