import { Collection, Db } from "mongodb";
import { Channel } from "../entities/channel";

export class ChannelsDao {
  public channelsCollection: Collection<Channel>;
  constructor(db: Db) {
    this.channelsCollection = db.collection<Channel>("channels");
  }

  async create(
    channelId: string,
    channelTitle: string,
    userId: string,
    lastMessageDateTime: number | null
  ) {
    const channel: Channel = {
      userId,
      channelId,
      channelTitle,
      lastMessageDateTime,
    };
    const result = await this.channelsCollection.insertOne(channel);
    if (!result.acknowledged) {
      return undefined;
    }

    return channel;
  }

  async readOne(channelId: string, userId: string) {
    return this.channelsCollection.findOne<Channel>({
      userId,
      channelId,
    });
  }

  async getAll() {
    return this.channelsCollection.find().toArray();
  }

  async getAllByUserId(userId: string) {
    return this.channelsCollection.find({ userId }).toArray();
  }
}
