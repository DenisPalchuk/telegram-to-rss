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

export class ChannelsService {
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

    const messageGroups = organizeMessagesIntoGroups(lastMessages);

    const newMessageGroups = filterNewMessageGroups(
      messageGroups,
      backupMessagesByChannelId
    );

    console.log(
      `Need to process ${newMessageGroups.length} message groups for channel ${channel.channelId}`
    );

    const newItems: Item[] = [];
    const messagesToBackup: Message[] = [];

    for (const messageGroup of newMessageGroups) {
      const firstMessage = messageGroup.messages[0];
      const groupLabel =
        messageGroup.groupId || `message ${firstMessage.id}`;

      console.log(
        `Processing ${groupLabel} for channel ${channel.channelId}`
      );

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

      // Generate title from combined text
      const title = await this.aiService.summarizeTextToOneSentence(
        squashedMessage.text
      );
      console.log(`Generated title for ${groupLabel}: ${title}`);

      // Create content with all images
      let contentWithImages = squashedMessage.text.replace(/\n/g, "<br />");
      if (squashedMessage.imageFileNames.length > 0) {
        const imageHtml = squashedMessage.imageFileNames
          .map(
            (url) =>
              `<img src="${this.IMAGES_BASE_URL}/${url}" alt="${url}" />`
          )
          .join("");
        contentWithImages = `${contentWithImages}<br/>${imageHtml}`;
      }

      // Create RSS item - use linkMessageId for Telegram URL
      const item: Item = {
        title: title,
        link: `https://t.me/c/${firstMessage.chatId}/${squashedMessage.linkMessageId}`,
        date: new Date(squashedMessage.dateTime * 1000),
        content: contentWithImages,
        ...(squashedMessage.imageFileNames.length > 0 && {
          image: {
            url: `${this.IMAGES_BASE_URL}/${squashedMessage.imageFileNames[0]}`,
            type: "image/jpeg",
          },
        }),
      };
      newItems.push(item);

      // Backup message - use messageId (groupId for groups)
      messagesToBackup.push({
        messageId: squashedMessage.messageId,
        channelId: channel.channelId,
        dateTime: squashedMessage.dateTime,
        text: squashedMessage.text,
        title: title,
        ...(squashedMessage.imageFileNames.length > 0 && {
          imageFileNames: squashedMessage.imageFileNames,
        }),
        ...(squashedMessage.groupedId && {
          groupedId: squashedMessage.groupedId,
        }),
      });
    }

    const oldItems: Item[] = backupMessagesByChannelId.map((message) => {
      let contentWithImages = message.text.replace(/\n/g, "<br />");

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
        link: "https://t.me/c/" + message.channelId + "/" + message.messageId,
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
      [...oldItems, ...newItems]
    );

    console.log(`Writing XML feed for channel ${channel.channelId}`);

    await fs.promises.writeFile(`rss/${channel.channelId}.xml`, xmlFeed, {
      flag: "w+",
    });

    if (messagesToBackup.length > 0) {
      await this.messagesDao.batchInsert(messagesToBackup);
    }
  }
}
