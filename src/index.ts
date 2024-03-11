import { Hono } from "hono";
import { Bindings, Variables } from "./init";
import authRouter from "./routers/auth.router";
import channelsRouter from "./routers/channels.router";

const app = new Hono<{ Bindings: Bindings & Variables }>();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.route("/auth", authRouter);
app.route("/channels", channelsRouter);

export default app;
