import { Hono } from "hono";
import { Bindings, Variables, initLayers } from "../init";
import { verifyAuth } from "./middlewares/auth.middleware";
import { StringSession } from "telegram/sessions";
import { Logger, TelegramClient } from "telegram";
import { ConnectionTCPObfuscated } from "telegram/network";
import { LogLevel } from "telegram/extensions/Logger";

const app = new Hono<{ Bindings: Bindings & Variables }>();

app.use("*", verifyAuth());
app.post("/", async (c) => {
  console.log(c.env.TELEGRAM_SESSION_KEY);
  const stringSession = new StringSession(c.env.TELEGRAM_SESSION_KEY);
  const client = new TelegramClient(
    stringSession,
    parseInt(c.env.TELEGRAM_API_ID, 10),
    c.env.TELEGRAM_API_HASH,
    {
      systemVersion: "1.0",
      connectionRetries: 5,
      baseLogger: new Logger(LogLevel.DEBUG),
    }
  );
  await client.connect();

  const isAuthorized = await client.isUserAuthorized();
  if (!isAuthorized) {
    throw new Error("Telegram User is unAuthorized");
  }

  c.status(200);
  c.json({
    isAuthorized: isAuthorized,
  });
});

export default app;
