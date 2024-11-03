import express from "express";
import { verifyAuth } from "./middlewares/auth.middleware";
import { LogLevel, Logger } from "telegram/extensions/Logger";
import { TelegramClient } from "telegram";

export const getTelegramRouter = (client: TelegramClient) => {
  const router = express.Router();
  router.use(verifyAuth());

  router.post("/", async (req, res) => {
    console.log("telegram id", process.env.TELEGRAM_API_ID);
    console.log("telegram hash", process.env.TELEGRAM_API_HASH);

    const isAuthorized = await client.isUserAuthorized();
    if (!isAuthorized) {
      throw new Error("Telegram User is unAuthorized");
    }

    res.status(200).json({
      isAuthorized: isAuthorized,
    });
  });

  return router;
};
