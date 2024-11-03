import express from "express";
import { verifyAuth } from "./middlewares/auth.middleware";
import { ChannelsService } from "../services/channels.service";

export const getChannelsRouter = (channelsService: ChannelsService) => {
  const router = express.Router();

  router.use(verifyAuth());
  router.post("/", async (req, res) => {
    const user = req.user;
    const result = await channelsService.addChannel(
      req.body.channelId,
      user.userId,
    );
    if (!result) {
      res.status(500).send("Add channel operation failed");
    }

    res.json(result);
  });

  router.get("/:channelId/posts", async (req, res) => {
    const channelId = req.params.channelId;
  });

  return router;
};
