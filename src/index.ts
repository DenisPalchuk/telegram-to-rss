import express, { Request, Response, NextFunction } from "express";
import schedule from "node-schedule";
import { initLayers } from "./init";
import { errorHandler } from "./routers/middlewares/errors.middleware";
import fs from "fs";
import path from "path";
import { getRssRouter } from "./routers/rss.router";
import { ChannelsService } from "./services/channels.service";

const app = express();

initLayers().then(async (context) => {
  if (!fs.existsSync("./rss")) {
    fs.mkdirSync("./rss");
  }
  if (!fs.existsSync("./public")) {
    fs.mkdirSync("./public");
  }

  app.use(express.json());
  app.use(errorHandler);

  // Serve static files from public directory with security restrictions
  app.use(
    "/public",
    (req: Request, res: Response, next: NextFunction) => {
      const requestedPath = path.normalize(req.path);

      console.log(`Requested path: ${requestedPath}`);

      // Remove leading slash for validation
      const fileName = requestedPath.startsWith("/")
        ? requestedPath.slice(1)
        : requestedPath;

      // Validate filename: must be a UUID with .jpg extension
      const uuidJpgRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/i;
      if (!uuidJpgRegex.test(fileName)) {
        return res.status(403).send("Invalid filename");
      }

      next();
    },
    express.static(path.join(process.cwd(), "public"))
  );
  app.get("/", (req: Request, res: Response) => {
    res.send("Hello Express!");
  });

  // app.use(
  //   "/channels",
  //   getChannelsRouter(context.channelsService, context.telegramService)
  // );
  app.use("/rss", getRssRouter(context.usersService));

  app.listen(3001);

  console.log("Refreshing all channels on startup");
  await context.channelsService.refreshAllChannels();
  console.log("All channels refreshed after startup");

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
