import express from "express";
import { getAuthRouter } from "./routers/auth.router";
import { getChannelsRouter } from "./routers/channels.router";
import { getTelegramRouter } from "./routers/telegram.router";
import { initLayers } from "./init";

const app = express();

initLayers().then((context) => {
  app.get("/", (req, res) => {
    res.send("Hello Express!");
  });

  app.use("/auth", getAuthRouter(context.usersService));
  app.use("/channels", getChannelsRouter(context.channelsService));
  app.use("/telegram", getTelegramRouter(context.telegramClient));

  app.listen(3000);
});

export default app;
