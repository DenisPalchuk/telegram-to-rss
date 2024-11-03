import { Collection, Db } from "mongodb";
import { Channel } from "../entities/channel";

export class ChannelsDao {
  public chanelsCollection: Collection<Channel>;
  constructor(db: Db) {
    this.chanelsCollection = db.collection<Channel>("channels");
  }

  async create(
    channelId: string,
    userId: string,
    lastMessageDateTime: number | null,
  ) {
    return this.chanelsCollection.insertOne({
      userId,
      channelId,
      lastMessageDateTime,
    });
  }

  async readOne(channelId: string, userId: string) {
    return this.chanelsCollection.findOne<Channel>({
      userId,
      channelId,
    });
  }
}
