import { Context } from "hono";
import { UsersDao } from "./dao/users.dao";
import { UsersService } from "./services/users.service";
import { TokenService } from "./services/token.service";
import { ChannelsService } from "./services/channels.service";
import { ChannelsDao } from "./dao/channels.dao";

export type Bindings = {
  DB: D1Database;
};

export type Variables = {
  AUTH_SECRET: string;
};

export const initLayers = (
  c: Context<{
    Bindings: Bindings & Variables;
  }>
) => {
  const usersDao = new UsersDao(c.env.DB);
  const channelsDao = new ChannelsDao(c.env.DB);
  const tokenService = new TokenService(c.env.AUTH_SECRET);
  const usersService = new UsersService(usersDao, tokenService);
  const channelsService = new ChannelsService(channelsDao);

  return {
    usersService,
    channelsService,
  };
};
