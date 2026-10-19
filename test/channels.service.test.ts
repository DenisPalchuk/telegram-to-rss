import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { ChannelsService } from "../src/services/channels.service";
import { RssService } from "../src/services/rss.service";
import { Channel, Message } from "../src/entities/channel";

const channel: Channel = {
  channelId: "@example",
  channelTitle: "Example",
  userId: "user",
  lastMessageDateTime: null,
};
const originalDirectory = process.cwd();
let directory: string;

before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "rss-regression-"));
  process.chdir(directory);
  await fs.mkdir("rss");
});
after(async () => {
  process.chdir(originalDirectory);
  await fs.rm(directory, { recursive: true, force: true });
});

function createService(messages: any[], backup: Message[] = []) {
  let fetches = 0;
  let summaries = 0;
  let inserts = 0;
  const telegram = {
    getLastMessages: async (_channelId: string) => {
      fetches++;
      await new Promise((resolve) => setTimeout(resolve, 5));
      return messages;
    },
    downloadMessageMedia: async () => [],
  };
  const dao = {
    getMessagesByChannelId: async () => backup.slice(),
    batchInsert: async (items: Message[]) => {
      inserts++;
      backup.push(...items);
    },
  };
  const channels = {
    getAll: async () => [channel, { ...channel, userId: "other" }],
  };
  const ai = {
    summarizeTextToOneSentence: async () => {
      summaries++;
      return "Title";
    },
  };
  const service = new ChannelsService(
    channels as any,
    dao as any,
    new RssService(),
    telegram as any,
    ai as any,
    "https://example.com/public",
  );
  return {
    service,
    telegram,
    backup,
    counts: () => ({ fetches, summaries, inserts }),
  };
}

const message = (id: number, groupedId?: bigint) => ({
  id,
  groupedId,
  date: 1700000000,
  chatId: { toString: () => "-1001234567890" },
  text: `Message ${id}`,
});
const readFeed = () => fs.readFile("rss/@example.xml", "utf8");
const guids = (xml: string) =>
  [...xml.matchAll(/<guid>(.*?)<\/guid>/g)].map((match) => match[1]);
const links = (xml: string) =>
  [...xml.matchAll(/<item>[\s\S]*?<link>(.*?)<\/link>/g)].map(
    (match) => match[1],
  );

test("single and album GUIDs and links survive refresh and service restart", async () => {
  const messages = [
    message(30),
    message(20, 9000000000000n),
    message(19, 9000000000000n),
  ];
  const fixture = createService(messages);
  await fixture.service.refreshChannel(channel);
  const firstFeed = await readFeed();
  await fixture.service.refreshChannel(channel);
  const secondFeed = await readFeed();
  const restarted = createService(messages, fixture.backup);
  await restarted.service.refreshChannel(channel);
  const thirdFeed = await readFeed();
  assert.deepEqual(guids(secondFeed), guids(firstFeed));
  assert.deepEqual(guids(thirdFeed), guids(firstFeed));
  assert.deepEqual(links(secondFeed), links(firstFeed));
  assert.deepEqual(links(thirdFeed), links(firstFeed));
  assert.ok(links(firstFeed).includes("https://t.me/c/1234567890/19"));
  assert.equal(fixture.backup.length, 2);
  assert.equal(fixture.counts().summaries, 2);
  assert.equal(restarted.counts().summaries, 0);
});

test("concurrent channel refreshes share one processing run", async () => {
  const fixture = createService([message(40)]);
  await Promise.all(
    Array.from({ length: 5 }, () => fixture.service.refreshChannel(channel)),
  );
  assert.equal(fixture.counts().fetches, 1);
  assert.equal(fixture.counts().summaries, 1);
  assert.equal(fixture.backup.length, 1);
  assert.equal(guids(await readFeed()).length, 1);
});

test("concurrent full refreshes and manual refresh share pending work", async () => {
  const fixture = createService([message(45)]);
  await Promise.all([
    fixture.service.refreshAllChannels(),
    fixture.service.refreshAllChannels(),
    fixture.service.refreshChannel(channel),
  ]);
  assert.equal(fixture.counts().fetches, 1);
  assert.equal(fixture.backup.length, 1);
});

test("one failed channel does not stop refreshes or permanently hold the lock", async () => {
  const fixture = createService([message(50)]);
  (fixture.service as any).channelsDao.getAll = async () => [
    { ...channel, channelId: "broken" },
    channel,
  ];
  const getLastMessages = fixture.telegram.getLastMessages;
  fixture.telegram.getLastMessages = async (id) => {
    if (id === "broken") throw new Error("Telegram unavailable");
    return getLastMessages(id);
  };
  await fixture.service.refreshAllChannels();
  assert.equal(fixture.backup.length, 1);
  await fixture.service.refreshAllChannels();
  assert.equal(fixture.counts().fetches, 2);
});

test("a failed manual refresh releases the channel lock", async () => {
  const fixture = createService([message(55)]);
  const getLastMessages = fixture.telegram.getLastMessages;
  fixture.telegram.getLastMessages = async () => {
    throw new Error("Offline");
  };
  await assert.rejects(fixture.service.refreshChannel(channel), /Offline/);
  fixture.telegram.getLastMessages = getLastMessages;
  await fixture.service.refreshChannel(channel);
  assert.equal(fixture.backup.length, 1);
});

test("existing duplicate database records produce one item and keep legacy GUID", async () => {
  const stored: Message = {
    channelId: channel.channelId,
    messageId: "60",
    dateTime: 1700000000,
    text: "Stored text",
    title: "Stored title",
  };
  const fixture = createService([], [stored, { ...stored }]);
  await fixture.service.refreshChannel(channel);
  assert.deepEqual(guids(await readFeed()), ["https://t.me/c/@example/60"]);
});

test("a feed write failure preserves the previous XML and persisted progress", async () => {
  const fixture = createService([message(70)]);
  const previous = "previous complete XML";
  await fs.writeFile("rss/@example.xml", previous);
  const writeFile = fs.writeFile;
  fs.writeFile = (async (target: any, ...args: any[]) => {
    if (String(target).includes("@example.xml")) throw new Error("Disk full");
    return (writeFile as any)(target, ...args);
  }) as any;
  try {
    await assert.rejects(fixture.service.refreshChannel(channel), /Disk full/);
  } finally {
    fs.writeFile = writeFile;
  }
  assert.equal(await readFeed(), previous);
  assert.equal(fixture.backup.length, 1);
  await fixture.service.refreshChannel(channel);
  assert.equal(fixture.counts().summaries, 1);
  assert.equal(guids(await readFeed()).length, 1);
});
