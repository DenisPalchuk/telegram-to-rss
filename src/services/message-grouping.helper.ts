import { Api } from "telegram";
import { Message } from "../entities/channel";

export interface MessageGroup {
  groupId: string | null; // null for single messages
  messages: Api.Message[];
}

export interface SquashedMessage {
  messageId: string; // groupId for groups, message.id for singles
  linkMessageId: string; // Actual message ID for Telegram link
  channelId: string;
  text: string; // Combined text
  dateTime: number;
  imageFileNames: string[];
  groupedId?: string; // The groupId if this is a grouped message
}

export function organizeMessagesIntoGroups(
  messages: Api.Message[]
): MessageGroup[] {
  const groupsMap = new Map<string, Api.Message[]>();
  const emittedGroupIds = new Set<string>();
  const groups: MessageGroup[] = [];

  for (const message of messages) {
    if (message.groupedId) {
      const groupId = message.groupedId.toString();
      if (!groupsMap.has(groupId)) {
        groupsMap.set(groupId, []);
      }
      groupsMap.get(groupId)!.push(message);
    }
  }

  for (const msgs of groupsMap.values()) {
    msgs.sort((a, b) => a.date - b.date);
  }

  for (const message of messages) {
    if (message.groupedId) {
      const groupId = message.groupedId.toString();
      if (!emittedGroupIds.has(groupId)) {
        groups.push({ groupId, messages: groupsMap.get(groupId)! });
        emittedGroupIds.add(groupId);
      }
    } else {
      groups.push({ groupId: null, messages: [message] });
    }
  }

  return groups;
}

export function filterNewMessageGroups(
  messageGroups: MessageGroup[],
  backupMessages: Message[]
): MessageGroup[] {
  const backupMessageIds = new Set(backupMessages.map((m) => m.messageId));

  return messageGroups.filter((group) => {
    if (group.groupId) {
      // For grouped messages, check if groupId exists in backup
      return !backupMessageIds.has(group.groupId);
    } else {
      // For single messages, check if message.id exists in backup
      return !backupMessageIds.has(group.messages[0].id.toString());
    }
  });
}

export function squashMessageGroup(
  group: MessageGroup,
  channelId: string,
  imageFileNames: string[]
): SquashedMessage {
  const messages = group.messages;
  const firstMessage = messages[0];

  const textParts = messages
    .map((msg) => msg.text)
    .filter((text) => text && text.trim().length > 0);
  const combinedText = textParts.join("\n");

  const earliestDate = firstMessage.date;

  const messageId = group.groupId || firstMessage.id.toString();
  const linkMessageId = firstMessage.id.toString();

  return {
    messageId,
    linkMessageId,
    channelId,
    text: combinedText,
    dateTime: earliestDate,
    imageFileNames: imageFileNames,
    ...(group.groupId && { groupedId: group.groupId }),
  };
}
