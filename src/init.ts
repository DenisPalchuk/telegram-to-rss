import { UsersService } from "./services/users.service";
import { ChannelsService } from "./services/channels.service";
import { ChannelsDao } from "./dao/channels.dao";
import { UsersDao } from "./dao/user.dao";
import { MongoClient } from "mongodb";
import { Logger, TelegramClient } from "telegram";
import { LogLevel } from "telegram/extensions/Logger";
import { StringSession } from "telegram/sessions";
import { TelegramSDK } from "./services/telegram.service";
import { RssService } from "./services/rss.service";
import { AIService } from "./services/ai.service";
import { MessagesDao } from "./dao/messages.dao";
import { TelegramBot } from "./bot/bot";

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
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const BOT_CLIENT_TOKEN = process.env.BOT_CLIENT_TOKEN;
  const BASE_URL = process.env.BASE_URL;
  const RSS_FEED_URL = `${BASE_URL}/rss`;
  const IMAGES_BASE_URL = `${BASE_URL}/public`;

  if (
    !MONGO_DB ||
    !MONGO_URI ||
    !AUTH_SECRET ||
    !TELEGRAM_API_ID ||
    !TELEGRAM_API_HASH ||
    !TELEGRAM_SESSION_KEY ||
    !ANTHROPIC_API_KEY ||
    !BOT_CLIENT_TOKEN ||
    !RSS_FEED_URL
  ) {
    throw new Error("ENV variables are not set properly");
  }

  const stringSession = new StringSession(TELEGRAM_SESSION_KEY);

  const telegramClient = new TelegramClient(
    stringSession,
    parseInt(TELEGRAM_API_ID, 10),
    TELEGRAM_API_HASH,
    {
      systemVersion: "1.0",
      connectionRetries: 5,
      baseLogger: new Logger(LogLevel.INFO),
    }
  );
  telegramClient.setParseMode("markdown");
  await telegramClient.connect();

  const telegramSdk = new TelegramSDK(telegramClient);

  // DAOs
  const mongoClient = new MongoClient(MONGO_URI);
  const db = mongoClient.db(MONGO_DB);
  const usersDao = new UsersDao(db);
  const channelsDao = new ChannelsDao(db);
  const messagesDao = new MessagesDao(db);

  // Services
  const rssService = new RssService();
  const aiService = new AIService(ANTHROPIC_API_KEY);
  const usersService = new UsersService(usersDao);
  const channelsService = new ChannelsService(
    channelsDao,
    messagesDao,
    rssService,
    telegramSdk,
    aiService,
    IMAGES_BASE_URL
  );

  const bot = new TelegramBot(
    BOT_CLIENT_TOKEN,
    RSS_FEED_URL,
    usersService,
    channelsService
  );
  await bot.setupCommands();
  bot.start();

  return {
    usersService,
    channelsService,
    telegramService: telegramSdk,
  };
};
