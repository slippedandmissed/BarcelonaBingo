import Elysia from "elysia";
import player from "./player";
import games from "./games";

export default new Elysia({ prefix: "/api" }).use(player).use(games);
