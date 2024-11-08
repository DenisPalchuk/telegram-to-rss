import { Feed, Item } from "feed";
import { FeedInfo } from "../entities/feed";
import { Api } from "telegram";
import { TelegramSDK } from "./telegram.service";

export class RssService {
  constructor() {}

  getXmlFeedFromItems(feedInfo: FeedInfo, items: Item[]): string {
    const feed = new Feed({
      title: feedInfo.title,
      description: feedInfo.description,
      id: feedInfo.id,
      link: feedInfo.link,
      language: "en", // optional, used only in RSS 2.0, possible values: http://www.w3.org/TR/REC-html40/struct/dirlang.html#langcodes
      // image: "http://example.com/image.png",
      // favicon: "http://example.com/favicon.ico",
      copyright: "All rights reserved 2013, John Doe",
      updated: new Date(), // optional, default = today
      // generator: "awesome", // optional, default = 'Feed for Node.js'
      feedLinks: {
        json: "https://example.com/json",
        atom: "https://example.com/atom",
      },
      author: {
        name: "John Doe",
        email: "johndoe@example.com",
        link: "https://example.com/johndoe",
      },
    });
    items.forEach((item) => {
      feed.addItem(item);
    });

    return feed.rss2();
  }
}
