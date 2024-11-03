import { ObjectId } from "mongodb";

export interface Channel {
  userId: string;
  channelId: string;
  lastMessageDateTime: number | null;
}
