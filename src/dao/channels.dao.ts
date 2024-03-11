export interface Channel {
  uuid: string;
  userId: string;
  channelId: string;
  lastMessageId: string | null;
}

export class ChannelsDao {
  constructor(private readonly db: D1Database) {}

  async create(
    channelId: string,
    userId: string,
    lastMessageId: string | null
  ) {
    const uuid = crypto.randomUUID();
    return this.db
      .prepare(
        `INSERT INTO channels (id, userId, channelId, lastMessageId) VALUES (?, ?, ?, ?) RETURNING *`
      )
      .bind(uuid, userId, channelId, lastMessageId)
      .run() as Promise<D1Result<Channel>>;
  }

  async readOne(channelId: string, userId: string) {
    return this.db
      .prepare("SELECT * FROM channels WHERE userId = ? AND channelId = ?")
      .bind(userId, channelId)
      .first<Channel>();
  }
}
