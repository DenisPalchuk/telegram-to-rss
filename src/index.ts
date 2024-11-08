import express from "express";
import schedule from "node-schedule";
import { initLayers } from "./init";
import { errorHandler } from "./routers/middlewares/errors.middleware";
import fs from "fs";
import { getRssRouter } from "./routers/rss.router";
import { Channel } from "diagnostics_channel";
import { ChannelsService } from "./services/channels.service";

const app = express();

initLayers().then((context) => {
  if (!fs.existsSync("./rss")) {
    fs.mkdirSync("./rss");
  }
  app.use(express.json());
  app.use(errorHandler);
  app.get("/", (req, res) => {
    res.send("Hello Express!");
  });

  // app.use(
  //   "/channels",
  //   getChannelsRouter(context.channelsService, context.telegramService)
  // );
  app.use("/rss", getRssRouter(context.usersService));

  app.listen(3001);

  schedule.scheduleJob(
    "* 6 * * *",
    async function (channelsService: ChannelsService) {
      console.log("Refreshing all channels");
      await channelsService.refreshAllChannels();
      console.log("All channels refreshed");
    }.bind(null, context.channelsService)
  );
});

export default app;
