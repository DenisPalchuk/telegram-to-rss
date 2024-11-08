import { TelegramClient } from "telegram";
import { Api } from "telegram/tl";
import { RssService } from "./rss.service";
import { Item } from "feed";
import { AIService } from "./ai.service";
import { sleep } from "telegram/Helpers";

export class TelegramService {
  constructor(
    readonly client: TelegramClient,
    private readonly aiService: AIService,
    private readonly rssService: RssService,
  ) {}

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
      }),
    );

    return (result.messages as Api.Message[]).map((message) => {
      message._client = this.client;
      message._text = undefined;
      message._client?.setParseMode("html");
      return message;
    });
  }

  async getXmlFeedFromMessages(messages: Api.Message[]) {
    const items: Item[] = [];
    for (const message of messages) {
      const text = message.text;
      console.log(text);
      await sleep(3000);
      const result = await this.aiService.summarizeTextToOneSentense(text);
      console.log("summarization result: ", result);
      const title = result;

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
      items.push(item);
    }

    return this.rssService.getXmlFeedFromItems(
      {
        id: "feedId",
        title: "feedTitle",
        description: "feedDescription",
        link: "feedLink",
        language: "en",
      },
      items,
    );
  }

  async getLastMessagesAsXmlFeed(channelId: string) {
    const messages = await this.getLastMessages(channelId);
    return this.getXmlFeedFromMessages(messages);
  }
}
