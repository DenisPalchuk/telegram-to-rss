import assert from "node:assert/strict";
import { test } from "node:test";
import { MessagesDao } from "../src/dao/messages.dao";
import { Message } from "../src/entities/channel";

test("saving a message twice is idempotent and scoped to its channel", async () => {
  const saved: Message[] = [];
  const collection = {
    insertMany: async (messages: Message[]) => {
      saved.push(...messages);
    },
    bulkWrite: async (operations: any[]) => {
      for (const { updateOne } of operations) {
        const { filter, update } = updateOne;
        const existing = saved.find(
          (message) =>
            message.channelId === filter.channelId &&
            message.messageId === filter.messageId,
        );
        if (!existing) saved.push(update.$setOnInsert);
      }
    },
  };
  const dao = new MessagesDao({ collection: () => collection } as any);
  const message: Message = {
    channelId: "one",
    messageId: "10",
    title: "Title",
    text: "Text",
    dateTime: 1,
  };
  await dao.batchInsert([message]);
  await dao.batchInsert([message]);
  await dao.batchInsert([{ ...message, channelId: "two" }]);
  assert.equal(saved.length, 2);
});
