import { Collection, Db } from "mongodb";
import { Message } from "../entities/channel";

export class MessagesDao {
  public messagesCollection: Collection<Message>;
  constructor(db: Db) {
    this.messagesCollection = db.collection<Message>("messages");
  }

  async batchInsert(messages: Message[]) {
    return this.messagesCollection.insertMany(messages);
  }

  async getMessagesByChannelId(channelId: string) {
    return this.messagesCollection.find({ channelId }).toArray();
  }

  async getAll() {
    return this.messagesCollection.find().toArray();
  }
}
