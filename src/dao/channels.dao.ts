export interface Channel {
  uuid: string;
  userId: string;
  channelId: string;
  lastMessageDateTime: number | null;
}

export class ChannelsDao {
  constructor(private readonly db: D1Database) {}

  async create(
    channelId: string,
    userId: string,
    lastMessageDateTime: number | null
  ) {
    const uuid = crypto.randomUUID();
    return this.db
      .prepare(
        `INSERT INTO channels (id, userId, channelId, lastMessageDateTime) VALUES (?, ?, ?, ?) RETURNING *`
      )
      .bind(uuid, userId, channelId, lastMessageDateTime)
      .run() as Promise<D1Result<Channel>>;
  }

  async readOne(channelId: string, userId: string) {
    return this.db
      .prepare("SELECT * FROM channels WHERE userId = ? AND channelId = ?")
      .bind(userId, channelId)
      .first<Channel>();
  }
}
