import express from "express";
import { getAuthRouter } from "./routers/auth.router";
import { getChannelsRouter } from "./routers/channels.router";
import { initLayers } from "./init";
import { errorHandler } from "./routers/middlewares/errors.middleware";

const app = express();

initLayers().then((context) => {
  app.use(express.json());
  app.use(errorHandler);
  app.get("/", (req, res) => {
    res.send("Hello Express!");
  });

  app.use("/auth", getAuthRouter(context.usersService));
  app.use(
    "/channels",
    getChannelsRouter(context.channelsService, context.telegramService)
  );

  app.listen(3001);
});

export default app;
