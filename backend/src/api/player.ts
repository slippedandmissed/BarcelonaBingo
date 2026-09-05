import Elysia, { t } from "elysia";
import { createPlayer, getPlayerByCode, getPlayerById, updatePlayer } from "../core/player";
import { db } from "../db/db";
import {
  createSessionForPlayer,
  requireSession,
  SESSION_COOKIE_NAME,
  listSessionsForPlayer,
  revokeSession,
} from "../core/auth";
import { HttpError } from "../core/errors/http_error";
import { config } from "../config";

export default new Elysia({ prefix: "/player" })
  .post(
    "/",
    async ({ body, set }) => {
      return await db.transaction(async (tx) => {
        const { id, code } = await createPlayer({ ...body, tx });
        set.status = 201;
        return { id, code };
      });
    },
    {
      body: t.Object({
        name: t.String(),
      }),
      response: t.Object({
        id: t.String(),
        code: t.String(),
      }),
    },
  )
  .get(
    "/login",
    async ({
      query: { code, redirectUrl },
      cookie: { [SESSION_COOKIE_NAME]: sessionCookie },
      redirect,
    }) => {
      return await db.transaction(async (tx) => {
        if (!config.server.allowedRedirectOrigins.includes(new URL(redirectUrl).origin)) {
          throw new HttpError(400, "Invalid redirect URL");
        }
        const player = await getPlayerByCode({ code, tx });
        if (!player) {
          throw new HttpError(401, "Unauthorized");
        }
        const session = await createSessionForPlayer({ player, tx });
        sessionCookie?.set({
          value: session.id,
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: config.server.secure,
        });
        return redirect(redirectUrl);
      });
    },
    {
      query: t.Object({
        code: t.String(),
        redirectUrl: t.String(),
      }),
      response: t.String(),
    },
  )
  .get(
    "/:playerId",
    async ({ params: { playerId } }) => {
      const player = await getPlayerById({ id: playerId });
      if (!player) {
        throw new HttpError(404, "Player not found");
      }
      return {
        name: player.name,
      };
    },
    {
      response: t.Object({
        name: t.String(),
      }),
    },
  )
  .group("/me", (app) =>
    app
      .use(requireSession)
      .get(
        "/",
        async ({ player: { id, name, code } }) => {
          return { id, name, code };
        },
        {
          response: t.Object({
            id: t.String(),
            name: t.String(),
            code: t.String(),
          }),
        },
      )
      .patch(
        "/",
        async ({ player, body }) => {
          await updatePlayer({ player, ...body });
          return "Ok";
        },
        {
          body: t.Object({
            name: t.String(),
          }),
          response: t.String(),
        },
      )
      .post(
        "/logout",
        async ({ player, session, cookie: { [SESSION_COOKIE_NAME]: sessionCookie } }) => {
          if (sessionCookie) {
            sessionCookie.remove();
          }
          await revokeSession({ player, sessionId: session!.id });
          return "Ok";
        },
        {
          response: t.String(),
        },
      )
      .get(
        "/session",
        async ({ player }) => {
          const sessions = await listSessionsForPlayer({ player });
          return {
            sessions: sessions.map(({ id, createdAt, expiresAt }) => ({
              id,
              createdAt,
              expiresAt,
            })),
          };
        },
        {
          response: t.Object({
            sessions: t.Array(
              t.Object({
                id: t.String(),
                createdAt: t.Date(),
                expiresAt: t.Date(),
              }),
            ),
          }),
        },
      )
      .delete(
        "/session/:sessionId",
        async ({
          params: { sessionId },
          player,
          session,
          cookie: { [SESSION_COOKIE_NAME]: sessionCookie },
        }) => {
          await revokeSession({ player, sessionId });
          if (session.id === sessionId) {
            sessionCookie?.remove();
          }
          return "Ok";
        },
        {
          response: t.String(),
        },
      ),
  );
