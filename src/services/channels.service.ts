import { ChannelsDao } from "../dao/channels.dao";

export class ChannelsService {
  constructor(private readonly channelsDao: ChannelsDao) {}

  async addChannel(channelId: string, userId: string) {
    const result = await this.channelsDao.create(channelId, userId, null);
    if (!result.success) {
      return undefined;
    }

    return result.results;
  }
}
