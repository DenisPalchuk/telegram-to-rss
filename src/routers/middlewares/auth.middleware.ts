import { MiddlewareHandler } from "hono";
import { verify } from "hono/jwt";

export function verifyAuth(): MiddlewareHandler {
  return async (c, next) => {
    const authHeader = c.req.header("authorization");

    if (!authHeader) {
      c.status(401);
      return c.text("No auth header provided.");
    }

    const token = authHeader.replace("Bearer ", "");

    const decodedPayload = await verify(token, c.env.AUTH_SECRET);

    if (!decodedPayload) {
      c.status(401);
      return c.text("invalid payload");
    }
    c.set("jwtPayload", decodedPayload);

    await next();
  };
}
