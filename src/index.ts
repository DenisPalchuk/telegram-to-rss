import express, { Request, Response, NextFunction } from "express";
import schedule from "node-schedule";
import { initLayers } from "./init";
import { errorHandler } from "./routers/middlewares/errors.middleware";
import fs from "fs";
import path from "path";
import { getRssRouter } from "./routers/rss.router";
import { Channel } from "diagnostics_channel";
import { ChannelsService } from "./services/channels.service";

const app = express();

initLayers().then((context) => {
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

      // Check for path traversal attempts
      if (requestedPath.includes("..") || path.isAbsolute(requestedPath)) {
        return res.status(403).send("Access denied");
      }

      // Validate filename: only alphanumeric + exactly one dot for extension
      const fileNameRegex = /^[a-zA-Z0-9]+\.[a-zA-Z0-9]+$/;
      if (!fileNameRegex.test(fileName)) {
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
