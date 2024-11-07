import express from "express";
import fs from "fs/promises";
import path from "path";
import { UsersService } from "../services/users.service";

export const getRssRouter = (usersService: UsersService) => {
  const router = express.Router();

  router.get("/:userId/:channelId", async (req, res, next) => {
    try {
      const { userId, channelId } = req.params;

      const user = await usersService.getUserById(userId);
      if (!user) {
        res.status(403).send("Access denied");
        return;
      }

      const escapedChannelId = channelId.replace(/[^a-zA-Z0-9-_]/g, "");

      const xml = await fs.readFile(
        path.join(__dirname, `../../rss/${escapedChannelId}.xml`),
        "utf-8",
      );

      res.setHeader("Content-type", "text/xml;charset=UTF-8");
      res.send(xml);
    } catch (error) {
      next(error);
    }
  });

  return router;
};
