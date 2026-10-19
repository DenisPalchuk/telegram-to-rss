import { Collection, Db } from "mongodb";
import { Message } from "../entities/channel";

export class MessagesDao {
  public messagesCollection: Collection<Message>;
  constructor(db: Db) {
    this.messagesCollection = db.collection<Message>("messages");
  }

  async batchInsert(messages: Message[]) {
    if (messages.length === 0) {
      return;
    }
    return this.messagesCollection.bulkWrite(
      messages.map((message) => ({
        updateOne: {
          filter: {
            channelId: message.channelId,
            messageId: message.messageId,
          },
          update: { $setOnInsert: message },
          upsert: true,
        },
      }))
    );
  }

  async getMessagesByChannelId(channelId: string) {
    return this.messagesCollection.find({ channelId }).toArray();
  }

  async getAll() {
    return this.messagesCollection.find().toArray();
  }

  async deleteByChannelId(channelId: string) {
    const result = await this.messagesCollection.deleteMany({ channelId });
    return result.deletedCount;
  }
}
