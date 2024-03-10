import { Context } from "hono";
import { UsersDao } from "./dao/users.dao";
import { UsersService } from "./services/users.service";

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

  const usersService = new UsersService(usersDao, c.env.AUTH_SECRET);

  return {
    usersService,
  };
};
