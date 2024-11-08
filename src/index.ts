import express from "express";
import schedule from "node-schedule";
import { initLayers } from "./init";
import { errorHandler } from "./routers/middlewares/errors.middleware";
import fs from "fs";
import { getRssRouter } from "./routers/rss.router";

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

  // schedule.scheduleJob("5 * * * *", function () {
  //   console.log("The answer to life, the universe, and everything!");
  // });
});

export default app;
