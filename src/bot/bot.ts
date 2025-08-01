import { Bot, Context, session, SessionFlavor } from "grammy";
import { UsersService } from "../services/users.service";
import { ChannelsService } from "../services/channels.service";

interface SessionData {
  waitingForChannel?: boolean;
}

type MyContext = Context & SessionFlavor<SessionData>;

export class TelegramBot {
  private bot: Bot<MyContext>;

  constructor(
    token: string,
    private readonly rssUrl: string,
    private readonly usersService: UsersService,
    private readonly channelsService: ChannelsService
  ) {
    this.bot = new Bot<MyContext>(token);
    this.setupMiddleware();
  }

  private setupMiddleware() {
    this.bot.use(
      session({
        initial: (): SessionData => ({
          waitingForChannel: false,
        }),
      })
    );
  }

  async setupCommands() {
    // Start command
    this.bot.command("start", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;

      await this.usersService.createUser(userId);
      await ctx.reply(
        "Welcome! Use these commands:\n" +
          "/channels - List your channels\n" +
          "/add - Add new channel\n" +
          "/remove - Remove channel\n" +
          "/feed - Get RSS feed URL"
      );
    });

    // Set bot commands for the menu
    await this.bot.api.setMyCommands([
      { command: "start", description: "Start the bot" },
      { command: "channels", description: "List your channels" },
      { command: "add", description: "Add new channel" },
      { command: "remove", description: "Remove channel" },
      { command: "feed", description: "Get RSS feed URL" },
    ]);

    // List channels
    this.bot.command("channels", async (ctx) => {
      const userId = ctx.from?.id;
      if (!userId) return;
      const user = await this.usersService.getUserByTgId(userId);
      if (!user) return;

      const channels = await this.channelsService.getChannelsByUserId(
        user._id.toString()
      );
      if (!channels?.length) {
        await ctx.reply(
          "You don't have any channels yet. Use /add to add one."
        );
        return;
      }

      const channelsList = channels.map((c) => `- ${c.channelId}`).join("\n");
      await ctx.reply(`Your channels:\n${channelsList}`);
    });

    // Add channel
    this.bot.command("add", async (ctx) => {
      ctx.session.waitingForChannel = true;
      await ctx.reply(
        "Please send me the channel link (e.g., https://t.me/your_channel)"
      );
    });

    // Get RSS feed
    this.bot.command("feed", async (ctx) => {
      console.log("feed command");
      const userId = ctx.from?.id;
      if (!userId) return;

      const user = await this.usersService.getUserByTgId(userId);
      if (!user) return;

      const channels = await this.channelsService.getChannelsByUserId(
        user._id.toString()
      );
      if (!channels?.length) {
        await ctx.reply(
          "You don't have any channels yet. Use /add to add one."
        );
        return;
      }

      console.log("channels", channels);

      const feedUrls = channels
        .map(
          (c) =>
            `${c.channelTitle.replaceAll("-", "\\-").replaceAll("|", "\\|")}: <code>${this.rssUrl}/${c.userId}/${c.channelId}.xml</code>`
        )
        .join("\n");

      await ctx.reply(`Your RSS feeds:\n${feedUrls}`, {
        parse_mode: "HTML",
      });
    });

    // Handle channel addition
    this.bot.on("message", async (ctx) => {
      if (!ctx.session.waitingForChannel) return;
      if (!ctx.message?.text) return;
      let channelId = ctx.message.text.trim();
      const userId = ctx.from?.id;
      if (!userId) return;

      const user = await this.usersService.getUserByTgId(userId);
      if (!user) return;

      // Remove "https://t.me/" if present
      if (channelId.startsWith("https://t.me/")) {
        channelId = channelId.replace("https://t.me/", "");
      }

      // Remove "@" if present
      channelId = channelId.replace("@", "");

      // Validate channelId
      if (!channelId) {
        await ctx.reply("Invalid channel link. Please try again.");
        return;
      }

      try {
        const result = await this.channelsService.addChannel(
          channelId,
          user._id.toString()
        );
        if (!result) {
          await ctx.reply(
            "Failed to add channel. Please check the channel ID and try again."
          );
          ctx.session.waitingForChannel = false;
          return;
        }
        await ctx.reply(`Channel ${channelId} added successfully!`);
      } catch (error) {
        await ctx.reply(
          "Failed to add channel. Please check the channel ID and try again."
        );
      }

      ctx.session.waitingForChannel = false;
    });
  }

  public start() {
    this.bot.start();
  }
}
