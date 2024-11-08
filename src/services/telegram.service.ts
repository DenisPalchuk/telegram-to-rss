import { TelegramClient } from "telegram";
import { Api } from "telegram/tl";

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
}
