import { ChannelsDao } from "../dao/channels.dao";

export class ChannelsService {
  constructor(private readonly channelsDao: ChannelsDao) {}

  async addChannel(channelId: string, userId: string) {
    const result = await this.channelsDao.create(channelId, userId, null);
    if (!result.acknowledged) {
      return undefined;
    }

    return true;
  }

  async getLastPostsByChannel(channelId: string, userId: string) {
    // TODO: create custom telegram sdk and use it for retrieving posts
  }
}
