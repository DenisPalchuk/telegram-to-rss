import fs from "fs";
import { ChannelsDao } from "../dao/channels.dao";
import { TelegramService } from "./telegram.service";

export class ChannelsService {
  constructor(
    private readonly channelsDao: ChannelsDao,
    private readonly telegramService: TelegramService,
  ) {}

  async addChannel(channelId: string, userId: string) {
    const result = await this.channelsDao.create(channelId, userId, null);
    if (!result.acknowledged) {
      return undefined;
    }

    await this.refreshChannelByChannelId(channelId);

    return true;
  }

  async refreshAllChannels() {
    const allChannels = await this.channelsDao.getAll();
    if (!Array.isArray(allChannels)) {
      throw new Error("Failed to parse all channels list");
    }

    const uniqueChannels = [...new Set(allChannels.map((c) => c.channelId))];

    for (const channelId of uniqueChannels) {
      await this.refreshChannelByChannelId(channelId);
    }
  }

  async refreshChannelByChannelId(channelId: string) {
    console.log("generate file for channel", channelId);
    const xmlFeed =
      await this.telegramService.getLastMessagesAsXmlFeed(channelId);
    await fs.promises.writeFile(`rss/${channelId}.xml`, xmlFeed, {
      flag: "w+",
    });
  }
}
