export interface Channel {
  userId: string;
  channelId: string;
  channelTitle: string;
  lastMessageDateTime: number | null;
}

export interface Message {
  messageId: string;
  channelId: string;
  title: string;
  text: string;
  dateTime: number;
  imageFileNames?: string[];
}
