import fs from "fs";
import { ChannelsDao } from "../dao/channels.dao";
import { TelegramSDK } from "./telegram.service";
import { Item } from "feed";
import { sleep } from "telegram/Helpers";
import { AIService } from "./ai.service";
import { RssService } from "./rss.service";
import { Channel, Message } from "../entities/channel";
import { MessagesDao } from "../dao/messages.dao";
import {
  organizeMessagesIntoGroups,
  filterNewMessageGroups,
  squashMessageGroup,
} from "./message-grouping.helper";
import { Api } from "telegram";
import { randomUUID } from "crypto";

export class ChannelsService {
  private readonly channelRefreshes = new Map<string, Promise<void>>();
  private allChannelsRefresh?: Promise<void>;

  constructor(
    private readonly channelsDao: ChannelsDao,
    private readonly messagesDao: MessagesDao,
    private readonly rssService: RssService,
    private readonly telegramService: TelegramSDK,
    private readonly aiService: AIService,
    private readonly IMAGES_BASE_URL: string
  ) {}

  async addChannel(channelId: string, userId: string) {
    let channelInfo;
    try {
      channelInfo = await this.telegramService.getChannelInfo(channelId);
    } catch (error) {
      console.error("Failed to get channel info", error);
      return;
    }

    if (!channelInfo || !(channelInfo.chats[0] as Api.Chat).title) {
      console.error("Channel not found");
      return;
    }

    const channelTitle = (channelInfo.chats[0] as Api.Chat).title;

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

  async removeChannel(channelId: string, userId: string) {
    const channel = await this.channelsDao.readOne(channelId, userId);
    if (!channel) {
      return false;
    }

    await this.messagesDao.deleteByChannelId(channelId);

    await this.channelsDao.delete(channelId, userId);

    try {
      await fs.promises.unlink(`rss/${channelId}.xml`);
    } catch (error) {
      console.error(
        `Failed to delete RSS file for channel ${channelId}`,
        error
      );
    }

    return true;
  }

  refreshAllChannels(): Promise<void> {
    if (!this.allChannelsRefresh) {
      this.allChannelsRefresh = this.updateAllChannels().finally(() => {
        this.allChannelsRefresh = undefined;
      });
    }
    return this.allChannelsRefresh;
  }

  private async updateAllChannels() {
    const allChannels = await this.channelsDao.getAll();
    if (!Array.isArray(allChannels)) {
      throw new Error("Failed to parse all channels list");
    }

    const uniqueChannelsMap = new Map<string, Channel>();
    allChannels.forEach((channel) => {
      uniqueChannelsMap.set(channel.channelId, channel);
    });

    const distinctChannels = Array.from(uniqueChannelsMap.values());

    for (const channel of distinctChannels) {
      try {
        await this.refreshChannel(channel);
      } catch (error) {
        console.error(`Failed to refresh channel ${channel.channelId}`, error);
      }
    }
  }

  refreshChannel(channel: Channel): Promise<void> {
    const pendingRefresh = this.channelRefreshes.get(channel.channelId);
    if (pendingRefresh) {
      return pendingRefresh;
    }

    const refresh = this.updateChannelFeed(channel).finally(() => {
      this.channelRefreshes.delete(channel.channelId);
    });
    this.channelRefreshes.set(channel.channelId, refresh);
    return refresh;
  }

  private async updateChannelFeed(channel: Channel) {
    console.log("generate file for channel", channel.channelId);
    const lastMessages = await this.telegramService.getLastMessages(
      channel.channelId
    );

    const backupMessagesByChannelId =
      await this.messagesDao.getMessagesByChannelId(channel.channelId);

    const messageGroups = organizeMessagesIntoGroups(lastMessages);

    const newMessageGroups = filterNewMessageGroups(
      messageGroups,
      backupMessagesByChannelId
    );

    console.log(
      `Need to process ${newMessageGroups.length} message groups for channel ${channel.channelId}`
    );

    const messagesById = new Map<string, Message>(
      backupMessagesByChannelId.map((message) => [message.messageId, message])
    );

    for (const messageGroup of newMessageGroups) {
      const firstMessage = messageGroup.messages[0];
      const groupLabel = messageGroup.groupId || `message ${firstMessage.id}`;

      console.log(`Processing ${groupLabel} for channel ${channel.channelId}`);

      // Download media from all messages in the group
      let allImageFileNames: string[] = [];
      for (let i = 0; i < messageGroup.messages.length; i++) {
        if (i > 0) await sleep(3000); // Rate limiting
        const imageFileNames = await this.telegramService.downloadMessageMedia(
          messageGroup.messages[i]
        );
        allImageFileNames.push(...imageFileNames);
      }

      if (allImageFileNames.length > 0) {
        console.log(
          `Downloaded ${allImageFileNames.length} images for ${groupLabel}`
        );
      }

      // Squash the group (combines text and image file names)
      const squashedMessage = squashMessageGroup(
        messageGroup,
        channel.channelId,
        allImageFileNames
      );

      const chatId = firstMessage.chatId?.toString().replace(/^-100/, "");
      const telegramLink = chatId
        ? `https://t.me/c/${chatId}/${squashedMessage.linkMessageId}`
        : this.getTelegramLink(
            channel.channelId,
            squashedMessage.linkMessageId
          );
      const hasText = squashedMessage.text.trim().length > 0;

      let title: string;
      if (hasText) {
        title = await this.aiService.summarizeTextToOneSentence(
          squashedMessage.text
        );
        console.log(`Generated title for ${groupLabel}: ${title}`);
      } else {
        title = "Message without text";
        console.log(`No text in ${groupLabel}, skipping AI summarization`);
      }

      const message: Message = {
        messageId: squashedMessage.messageId,
        channelId: channel.channelId,
        dateTime: squashedMessage.dateTime,
        text: squashedMessage.text,
        title,
        telegramLink,
        ...(squashedMessage.imageFileNames.length > 0 && {
          imageFileNames: squashedMessage.imageFileNames,
        }),
        ...(squashedMessage.groupedId && {
          groupedId: squashedMessage.groupedId,
        }),
      };
      await this.messagesDao.batchInsert([message]);
      messagesById.set(message.messageId, message);
    }

    const items: Item[] = Array.from(messagesById.values()).map((message) => {
      const telegramLink =
        message.telegramLink ||
        this.getTelegramLink(message.channelId, message.messageId);
      let contentWithImages = message.text.trim()
        ? message.text.replace(/\n/g, "<br />")
        : `<a href="${telegramLink}">Open in Telegram</a>`;

      const imageFileNames = message.imageFileNames || [];

      if (imageFileNames.length > 0) {
        const imageHtml = imageFileNames
          .map(
            (url: string) =>
              `<img src="${this.IMAGES_BASE_URL}/${url}" alt="${url}" />`
          )
          .join("");
        contentWithImages = `${contentWithImages}<br/>${imageHtml}`;
      }

      return {
        title: message.title,
        guid: `https://t.me/c/${message.channelId}/${message.messageId}`,
        link: telegramLink,
        date: new Date(message.dateTime * 1000),
        content: contentWithImages,
        ...(imageFileNames.length > 0 && {
          image: {
            url: `${this.IMAGES_BASE_URL}/${imageFileNames[0]}`,
            type: "image/jpeg",
          },
        }),
      };
    });

    const xmlFeed = this.rssService.getXmlFeedFromItems(
      {
        id: channel.channelId,
        title: channel.channelTitle,
        description: `Feed of telegram channel - ${channel.channelTitle}`,
        link: "feedLink",
        language: "en",
      },
      items
    );

    console.log(`Writing XML feed for channel ${channel.channelId}`);

    const feedPath = `rss/${channel.channelId}.xml`;
    const temporaryPath = `${feedPath}.${randomUUID()}.tmp`;
    try {
      await fs.promises.writeFile(temporaryPath, xmlFeed);
      await fs.promises.rename(temporaryPath, feedPath);
    } finally {
      await fs.promises.rm(temporaryPath, { force: true });
    }
  }

  private getTelegramLink(channelId: string, messageId: string) {
    if (/^-?\d+$/.test(channelId)) {
      return `https://t.me/c/${channelId.replace(/^-100/, "")}/${messageId}`;
    }
    return `https://t.me/${channelId.replace(/^@/, "")}/${messageId}`;
  }
}
