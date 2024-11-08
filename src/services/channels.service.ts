import fs from "fs";
import { ChannelsDao } from "../dao/channels.dao";
import { TelegramSDK } from "./telegram.service";
import { Item } from "feed";
import { sleep } from "telegram/Helpers";
import { AIService } from "./ai.service";
import { RssService } from "./rss.service";
import { Channel, Message } from "../entities/channel";
import { MessagesDao } from "../dao/messages.dao";

export class ChannelsService {
  constructor(
    private readonly channelsDao: ChannelsDao,
    private readonly messagesDao: MessagesDao,
    private readonly rssService: RssService,
    private readonly telegramService: TelegramSDK,
    private readonly aiService: AIService
  ) {}

  async addChannel(channelId: string, userId: string) {
    let channelInfo;
    try {
      channelInfo = await this.telegramService.getChannelInfo(channelId);
    } catch (error) {
      console.error("Failed to get channel info", error);
      return;
    }

    if (!channelInfo || !channelInfo.chats[0].title) {
      console.error("Channel not found");
      return;
    }

    const channelTitle = channelInfo.chats[0].title;

    const channel = await this.channelsDao.create(
      channelId,
      channelTitle,
      userId,
      null
    );
    if (!channel) {
      return undefined;
    }

    await this.refreshChannel(channel);

    return true;
  }

  async getChannelsByUserId(userId: string) {
    return this.channelsDao.getAllByUserId(userId);
  }

  async refreshAllChannels() {
    const allChannels = await this.channelsDao.getAll();
    if (!Array.isArray(allChannels)) {
      throw new Error("Failed to parse all channels list");
    }

    const uniqueChannelsMap = new Map<string, any>();
    allChannels.forEach((channel) => {
      uniqueChannelsMap.set(channel.channelId, channel);
    });

    const distinctChannels = Array.from(uniqueChannelsMap.values());

    for (const channel of distinctChannels) {
      await this.refreshChannel(channel);
    }
  }

  async refreshChannel(channel: Channel) {
    console.log("generate file for channel", channel.channelId);
    const lastMessages = await this.telegramService.getLastMessages(
      channel.channelId
    );

    const backupMessagesByChannelId =
      await this.messagesDao.getMessagesByChannelId(channel.channelId);

    const newMessages = lastMessages.filter((message) => {
      return !backupMessagesByChannelId.find(
        (backupMessage) => backupMessage.messageId === message.id.toString()
      );
    });

    console.log(
      `Need to process new ${newMessages.length} messages for channel ${channel.channelId}`
    );

    const newItems: Item[] = [];
    const messagesToBackup: Message[] = [];
    for (const message of newMessages) {
      console.log(
        `Processing message ${message.id} for channel ${channel.channelId}`
      );
      const text = message.text;
      await sleep(3000);
      const result = await this.aiService.summarizeTextToOneSentense(text);
      const title = result;
      console.log(`generated title for message ${message.id}: ${title}`);

      const item: Item = {
        title: title,
        link: "https://t.me/c/" + message.chatId + "/" + message.id,
        date: new Date(message.date * 1000),
        // description: message.message,
        // image: message.media?.webpage?.photo ? {
        //   url: `https://cdn4.telegram-cdn.org/file/photo/${message.media.webpage.photo.id}`,
        //   length: message.media.webpage.photo.sizes.slice(-1)[0].size,
        //   type: 'image/jpeg'
        // } : undefined,
        content: text,
      };
      newItems.push(item);

      messagesToBackup.push({
        messageId: message.id.toString(),
        channelId: channel.channelId,
        dateTime: message.date,
        text: text,
        title: title,
      });
    }

    const oldItems: Item[] = backupMessagesByChannelId.map((message) => ({
      title: message.title,
      link: "https://t.me/c/" + message.channelId + "/" + message.messageId,
      date: new Date(message.dateTime * 1000),
      content: message.text,
    }));

    const xmlFeed = this.rssService.getXmlFeedFromItems(
      {
        id: channel.channelId,
        title: channel.channelTitle,
        description: `Feed of telegram channel - ${channel.channelTitle}`,
        link: "feedLink",
        language: "en",
      },
      [...oldItems, ...newItems]
    );

    await fs.promises.writeFile(`rss/${channel.channelId}.xml`, xmlFeed, {
      flag: "w+",
    });

    if (messagesToBackup.length > 0) {
      await this.messagesDao.batchInsert(messagesToBackup);
    }
  }
}
