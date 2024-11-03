import express from "express";
import { verifyAuth } from "./middlewares/auth.middleware";
import { ChannelsService } from "../services/channels.service";
import { TelegramService } from "../services/telegram.service";

export const getChannelsRouter = (
  channelsService: ChannelsService,
  telegramService: TelegramService,
) => {
  const router = express.Router();

  router.use(verifyAuth());
  router.post("/", async (req, res, next) => {
    try {
      const user = req.user;
      const result = await channelsService.addChannel(
        req.body.channelId,
        user.userId,
      );
      if (!result) {
        res.status(500).send("Add channel operation failed");
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:channelId/posts", async (req, res, next) => {
    try {
      const channelId = req.params.channelId;
      const posts = await telegramService.getLastMessages(channelId);
      res.json(posts);
      next();
    } catch (error) {
      next(error);
    }
  });

  return router;
};
