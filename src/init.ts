import { UsersService } from "./services/users.service";
import { TokenService } from "./services/token.service";
import { ChannelsService } from "./services/channels.service";
import { ChannelsDao } from "./dao/channels.dao";
import { UsersDao } from "./dao/user.dao";
import { MongoClient } from "mongodb";
import { Logger, TelegramClient } from "telegram";
import { LogLevel } from "telegram/extensions/Logger";

export type Variables = {
  AUTH_SECRET: string;
  TELEGRAM_API_ID: string;
  TELEGRAM_API_HASH: string;
  TELEGRAM_SESSION_KEY: string;
};

export const initLayers = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  const MONGO_DB = process.env.MONGO_DB;
  const AUTH_SECRET = process.env.AUTH_SECRET;

  const TELEGRAM_API_ID = process.env.TELEGRAM_API_ID;
  const TELEGRAM_API_HASH = process.env.TELEGRAM_API_HASH;
  const TELEGRAM_SESSION_KEY = process.env.TELEGRAM_SESSION_KEY;

  if (
    !MONGO_DB ||
    !MONGO_URI ||
    !AUTH_SECRET ||
    !TELEGRAM_API_ID ||
    !TELEGRAM_API_HASH ||
    !TELEGRAM_SESSION_KEY
  ) {
    throw new Error("ENV variables are not set properly");
  }

  // TODO: replace it with TelegramService and Telegram SDK
  const telegramClient = new TelegramClient(
    TELEGRAM_SESSION_KEY,
    parseInt(TELEGRAM_API_ID, 10),
    TELEGRAM_API_HASH,
    {
      systemVersion: "1.0",
      connectionRetries: 5,
      baseLogger: new Logger(LogLevel.DEBUG),
    },
  );
  await telegramClient.connect();

  const mongoClient = new MongoClient(MONGO_URI);
  const db = mongoClient.db(MONGO_DB);
  const usersDao = new UsersDao(db);
  const channelsDao = new ChannelsDao(db);
  const tokenService = new TokenService(AUTH_SECRET);
  const usersService = new UsersService(usersDao, tokenService);
  const channelsService = new ChannelsService(channelsDao);

  return {
    usersService,
    channelsService,
    tokenService,
    telegramClient,
  };
};
