import Elysia, { t } from "elysia";
import { requireSession } from "../core/auth";
import {
  abortGame,
  createGame,
  deleteGame,
  getGameByCode,
  getGameById,
  getGamesForPlayer,
  joinGame,
  listGameMembers,
  removePlayerFromGame,
  startGame,
} from "../core/game";
import type { Board, Game, Prompt } from "../db/schema/game";
import { HttpError } from "../core/errors/http_error";
import { db } from "../db/db";
import {
  areAllBoardsReady,
  didAnyBoardFail,
  getBoardByPlayerAndGame,
  getPromptsForBoard,
  getWinningPlayer,
} from "../core/board";
import {
  getPromptById,
  getRandomCompletedNonFreeSpacePrompt,
  markPromptAsCompleted,
  regeneratePrompt,
} from "../core/prompt";
import { getPlayerById } from "../core/player";

export default new Elysia({ prefix: "/games" })
  .use(requireSession)
  .post(
    "/",
    async ({ body: { name, isHostRemote }, player }) => {
      const game = await createGame({ player, name, isHostRemote });
      return {
        gameId: game.id,
      };
    },
    {
      body: t.Object({
        name: t.String(),
        isHostRemote: t.Boolean(),
      }),
      response: t.Object({
        gameId: t.String(),
      }),
    },
  )
  .get(
    "/",
    async ({ player }) => {
      const games = await getGamesForPlayer({ player });
      return {
        gameIds: games.map((game) => game.id),
      };
    },
    {
      response: t.Object({
        gameIds: t.Array(t.String()),
      }),
    },
  )
  .post(
    "/join",
    async ({ body: { gameCode, isRemote }, player }) => {
      return await db.transaction(async (tx) => {
        const game = await getGameByCode({ code: gameCode, tx });
        if (!game) {
          throw new HttpError(403, "Forbidden");
        }
        await joinGame({ game, player, isRemote, tx });
        return {
          gameId: game.id,
        };
      });
    },
    {
      body: t.Object({
        gameCode: t.String(),
        isRemote: t.Boolean(),
      }),
      response: t.Object({
        gameId: t.String(),
      }),
    },
  )
  .group("/game/:gameId", (app) =>
    app
      .resolve(async ({ player, params: { gameId } }): Promise<{ game: Game }> => {
        const game = await getGameById({ id: gameId, player });
        if (!game) {
          throw new HttpError(404, "Game not found");
        }
        return { game };
      })
      .get(
        "/",
        async ({ game }) => {
          return db.transaction(async (tx) => {
            const { name, code, createdAt, startedAt, abortedAt } = game;
            return {
              name,
              code,
              createdAt,
              startedAt,
              abortedAt,
              winner: (await getWinningPlayer({ game, tx }))?.id ?? null,
              playerIds: (await listGameMembers({ game, tx })).map((player) => player.id),
              // Challenge generation runs in the background after start (see
              // core/game.ts#startGame) — these tell the frontend when it's
              // safe to fetch prompts, and whether to offer a retry.
              boardsReady: startedAt ? await areAllBoardsReady({ game, tx }) : false,
              boardsFailed: startedAt ? await didAnyBoardFail({ game, tx }) : false,
            };
          });
        },
        {
          response: t.Object({
            name: t.String(),
            code: t.String(),
            createdAt: t.Date(),
            startedAt: t.Nullable(t.Date()),
            abortedAt: t.Nullable(t.Date()),
            winner: t.Nullable(t.String()),
            playerIds: t.Array(t.String()),
            boardsReady: t.Boolean(),
            boardsFailed: t.Boolean(),
          }),
        },
      )
      .post(
        "/start",
        async ({ game }) => {
          await startGame({ game });
          return "Ok";
        },
        {
          response: t.String(),
        },
      )
      .post(
        "/abort",
        async ({ game }) => {
          await abortGame({ game });
          return "Ok";
        },
        {
          response: t.String(),
        },
      )
      .post(
        "/leave",
        async ({ player, game }) => {
          await removePlayerFromGame({ player, game });
          return "Ok";
        },
        {
          response: t.String(),
        },
      )
      .post(
        "/kick",
        async ({ body: { playerId }, game }) => {
          return await db.transaction(async (tx) => {
            const player = await getPlayerById({ id: playerId, tx });
            if (!player) {
              throw new HttpError(404, "Player not found");
            }
            await removePlayerFromGame({ player, game, tx });
            return "Ok";
          });
        },
        {
          body: t.Object({
            playerId: t.String(),
          }),
          response: t.String(),
        },
      )
      .delete(
        "/",
        async ({ game }) => {
          await deleteGame({ game });
          return "Ok";
        },
        {
          response: t.String(),
        },
      )
      .group("/prompts", (app) =>
        app
          .resolve(async ({ game, player }): Promise<{ board: Board }> => {
            const board = await getBoardByPlayerAndGame({
              game,
              player,
              tx: db,
            });
            if (!board) {
              throw new HttpError(404, "Board not found");
            }
            return { board };
          })
          .get(
            "/",
            async ({ board }) => {
              return await db.transaction(async (tx) => {
                const prompts = await getPromptsForBoard({ board, tx });
                return {
                  prompts: prompts.map(({ id, text, row, column, completedAt, isFreeSpace }) => ({
                    id,
                    text,
                    row,
                    column,
                    completedAt,
                    isFreeSpace,
                  })),
                };
              });
            },
            {
              response: t.Object({
                prompts: t.Array(
                  t.Object({
                    id: t.String(),
                    text: t.String(),
                    row: t.Number(),
                    column: t.Number(),
                    completedAt: t.Nullable(t.Date()),
                    isFreeSpace: t.Boolean(),
                  }),
                ),
              }),
            },
          )
          .group("/:promptId", (app) =>
            app
              .resolve(async ({ params: { promptId }, player }): Promise<{ prompt: Prompt }> => {
                const prompt = await getPromptById({
                  id: promptId,
                  player,
                  tx: db,
                });
                if (!prompt) {
                  throw new HttpError(404, "Prompt not found");
                }
                return { prompt };
              })
              .post(
                "/regenerate",
                async ({ board, prompt }) => {
                  return await db.transaction(async (tx) => {
                    if (prompt.completedAt) {
                      throw new HttpError(400, "You can't regenerate a completed prompt");
                    }
                    const randomCompletedPrompt = await getRandomCompletedNonFreeSpacePrompt({
                      board,
                      tx,
                    });
                    if (!randomCompletedPrompt) {
                      throw new HttpError(
                        403,
                        "You're not allowed to regenerate a prompt until you've completed one. A random completed prompt will be un-completed as a penalty.",
                      );
                    }
                    await markPromptAsCompleted({
                      prompt: randomCompletedPrompt,
                      isCompleted: false,
                      tx,
                    });
                    await regeneratePrompt({ prompt, tx });
                    return "Ok";
                  });
                },
                {
                  response: t.String(),
                },
              )
              .post(
                "/completed",
                async ({ prompt, body }) => {
                  await markPromptAsCompleted({
                    prompt,
                    isCompleted: body.isCompleted,
                  });
                  return "Ok";
                },
                {
                  body: t.Object({
                    isCompleted: t.Boolean(),
                  }),
                  response: t.String(),
                },
              ),
          ),
      ),
  );
