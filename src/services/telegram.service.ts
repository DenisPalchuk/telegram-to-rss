import { TelegramClient } from "telegram";
import { Api } from "telegram/tl";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export class TelegramSDK {
  constructor(readonly client: TelegramClient) {}

  async getLastMessages(channelId: string): Promise<Api.Message[]> {
    const result = await this.client.invoke(
      new Api.messages.GetHistory({
        peer: channelId,
        limit: 20,
        offsetId: 0,
        offsetDate: 0,
        addOffset: 0,
        maxId: 0,
        minId: 0,
        hash: BigInt(0),
      })
    );

    return (result.messages as Api.Message[]).map((message) => {
      message._client = this.client;
      message._text = undefined;
      message._client?.setParseMode("html");
      return message;
    });
  }

  async getChannelInfo(channelId: string) {
    const result = await this.client.invoke(
      new Api.channels.GetFullChannel({
        channel: channelId,
      })
    );

    return result;
  }

  async downloadMessageMedia(message: Api.Message): Promise<string[]> {
    const imageFileNames: string[] = [];

    if (!message.media) {
      return imageFileNames;
    }

    // Check if message has photo
    if (
      message.media instanceof Api.MessageMediaPhoto &&
      message.media.photo instanceof Api.Photo
    ) {
      try {
        const buffer = await this.client.downloadMedia(message.media, {
          progressCallback: console.log,
        });
        if (buffer) {
          const fileName = `${randomUUID()}.jpg`;
          const filePath = path.join(process.cwd(), "public", fileName);
          await fs.promises.writeFile(filePath, buffer as Buffer);
          imageFileNames.push(fileName);
        }
      } catch (error) {
        console.error("Error downloading image:", error);
      }
    }

    // Check if message has document (could be image)
    if (
      message.media instanceof Api.MessageMediaDocument &&
      message.media.document instanceof Api.Document
    ) {
      const doc = message.media.document;

      // Check if it's an image by looking at mime type
      if (doc.mimeType && doc.mimeType.startsWith("image/")) {
        try {
          const buffer = await this.client.downloadMedia(message.media, {
            progressCallback: console.log,
          });
          if (buffer) {
            const extension = doc.mimeType.split("/")[1] || "jpg";
            const fileName = `${randomUUID()}.${extension}`;
            const filePath = path.join(process.cwd(), "public", fileName);
            await fs.promises.writeFile(filePath, buffer as Buffer);
            imageFileNames.push(fileName);
          }
        } catch (error) {
          console.error("Error downloading document image:", error);
        }
      }
    }

    return imageFileNames;
  }

  async downloadMediaGroup(
    messages: Api.Message[],
    groupedId: string
  ): Promise<string[]> {
    const imageUrls: string[] = [];

    // Find all messages with the same grouped_id
    const groupedMessages = messages.filter(
      (msg) => msg.groupedId && msg.groupedId.toString() === groupedId
    );

    for (const message of groupedMessages) {
      const fileNames = await this.downloadMessageMedia(message);
      imageUrls.push(...fileNames);
    }

    return imageUrls;
  }
}
