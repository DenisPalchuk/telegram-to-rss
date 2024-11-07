import express from "express";
import { verifyAuth } from "./middlewares/auth.middleware";
import { ChannelsService } from "../services/channels.service";
import { TelegramService } from "../services/telegram.service";

export const getChannelsRouter = (
  channelsService: ChannelsService,
  telegramService: TelegramService
) => {
  const router = express.Router();

  // router.use(verifyAuth());
  router.post("/", verifyAuth(), async (req, res, next) => {
    try {
      const user = req.user;
      const result = await channelsService.addChannel(
        req.body.channelId,
        user.userId
      );
      if (!result) {
        res.status(500).send("Add channel operation failed");
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/:channelId/posts", verifyAuth(), async (req, res, next) => {
    try {
      const channelId = req.params.channelId;
      const posts = await telegramService.getLastMessages(channelId);
      if (!Array.isArray(posts)) {
        res.status(500).send("Something went wrong");
        return;
      }

      res.json(
        posts.map((post) => {
          post._client = telegramService.client;
          // TODO: replace this trick with a better solution
          if (post._client?._parseMode) {
            post._text = undefined;
            post._client.setParseMode("markdownv2");

            return post;
          }

          return post;
        })
      );
      next();
    } catch (error) {
      next(error);
    }
  });

  router.get("/:channelId/posts/rss", async (req, res, next) => {
    try {
      const channelId = req.params.channelId;
      const xml = await telegramService.getLastMessagesAsXmlFeed(channelId);
      if (!xml) {
        res.status(500).send("Something went wrong");
        return;
      }

      res.setHeader("Content-type", "text/xml;charset=UTF-8");
      res.send(xml);

      next();
    } catch (error) {
      next(error);
    }
  });

  router.post("/posts/refresh", async (req, res, next) => {
    try {
      await channelsService.refreshAllChannels();
      res.send("Refreshed");
      next();
    } catch (error) {
      next(error);
    }
  });

  return router;
};
