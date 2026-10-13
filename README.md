<div align="center">

<h1>Telegram → RSS</h1>

<p><strong>Your channels. Your reader. Your pace.</strong></p>

<p>Bring Telegram writing into your RSS reader — with full post text,<br />photos, media albums, and AI-generated headlines.</p>

[![Container build](https://github.com/DenisPalchuk/telegram-to-rss/actions/workflows/publish-image.yml/badge.svg)](https://github.com/DenisPalchuk/telegram-to-rss/actions/workflows/publish-image.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](./src)
[![RSS 2.0](https://img.shields.io/badge/RSS-2.0-F97316?style=flat-square&logo=rss&logoColor=white)](#what-you-get)
[![Platforms](https://img.shields.io/badge/Docker-amd64%20%7C%20arm64-2496ED?style=flat-square&logo=docker&logoColor=white)](#quick-start)

<p>
  <a href="#what-you-get">Features</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#configuration">Configuration</a> ·
  <a href="#deploy-with-dokploy">Dokploy</a> ·
  <a href="#how-it-works">How it works</a>
</p>

</div>

---

## A place for the posts you want to keep

Telegram is home to independent writers, niche communities, and channels worth following. **Telegram → RSS** gives those posts a home alongside the rest of your reading.

Add a channel through your Telegram bot. Get an RSS URL. Subscribe in your favorite reader and catch up whenever you like.

You host the application, choose the channels, and keep the collected posts in your own MongoDB database.

```text
Telegram channels  →  posts + albums + headlines  →  your RSS reader
```

## What you get

| | Feature | What it does |
| :---: | --- | --- |
| 📰 | **Full post text** | Publishes the original message body in an RSS 2.0 feed. |
| 🖼️ | **Photos in the feed** | Downloads Telegram photos and embeds them in the article content. |
| 🧩 | **Albums stay together** | Combines related messages and images into a single feed entry. |
| ✨ | **Headlines with personality** | Uses DeepSeek to turn message text into a short headline. The original body is preserved. |
| 🤖 | **A bot as your control panel** | Add channels, manage subscriptions, and retrieve feed URLs inside Telegram. |
| 💾 | **Stored reading history** | Keeps processed posts in MongoDB and includes them in subsequent feed generations. |
| 📦 | **Ready to pull** | Publishes Docker images for Intel/AMD (`amd64`) and ARM (`arm64`) to GHCR. |

The headline prompt is tuned for Russian-language Telegram writing and aims to preserve the author's voice. You can customize it in [summarize-text.md](./src/prompts/summarize-text.md).

## From channel to subscription

Once your instance is running, open your bot and send:

```text
/start
/add
https://t.me/your_channel
/feed
```

The bot returns a feed URL for each subscribed channel:

```text
https://your-instance.example/rss/<userId>/<channelId>.xml
```

Paste that URL into an RSS reader. Each channel gets its own feed.

| Command | Action |
| --- | --- |
| `/start` | Register your Telegram user with the instance. |
| `/add` | Add a channel using its link, username, or ID. |
| `/channels` | List your subscribed channels. |
| `/feed` | Get your RSS subscription URLs. |
| `/remove` | Choose a channel subscription to remove. |

Channel history is fetched through a **Telegram account session**. The bot handles your commands; the account behind the session must be able to access the channels you add.

## Quick start

The setup below uses the published Docker image and an **external MongoDB instance**.

### 1. Prepare your credentials

You will need:

- A Telegram API ID and hash from [my.telegram.org](https://my.telegram.org/auth).
- A bot token from [@BotFather](https://t.me/BotFather), created with `/newbot`.
- A DeepSeek API key for headline generation.
- A MongoDB connection string and database name.

Clone the repository and install dependencies to use the session helper:

```bash
git clone https://github.com/DenisPalchuk/telegram-to-rss.git
cd telegram-to-rss
npm install
cp .env.example .env
```

Set `TELEGRAM_API_ID` and `TELEGRAM_API_HASH` in `.env`, then generate your Telegram session with a local Node.js version that supports `--env-file`:

```bash
node --env-file=.env utils/get-session-key.js
```

Follow the phone number, login code, and optional two-factor password prompts. Copy the resulting session string into `TELEGRAM_SESSION_KEY` in `.env`.

### 2. Configure the instance

Edit `.env` with your own values:

```dotenv
MONGO_URI=mongodb://USER:PASSWORD@MONGO_HOST:27017/?authSource=admin
MONGO_DB=telegram-to-rss
AUTH_SECRET=replace_with_a_long_random_value
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
TELEGRAM_SESSION_KEY=your_session_string
BOT_CLIENT_TOKEN=your_bot_token
DEEPSEEK_API_KEY=your_deepseek_api_key
BASE_URL=https://your-public-hostname
```

Use a MongoDB hostname or IP reachable from the container. `localhost` inside the application container refers to that container.

Set `BASE_URL` to the address your RSS reader will use, without a trailing slash. It is used for both feed links and image URLs. For a local-only instance, use `http://localhost:3001`.

### 3. Start the container

```bash
docker run -d \
  --name telegram-to-rss \
  --restart unless-stopped \
  --env-file .env \
  -p 127.0.0.1:3001:3001 \
  -v telegram-rss-feeds:/app/rss \
  -v telegram-rss-images:/app/public \
  ghcr.io/denispalchuk/telegram-to-rss:latest
```

Docker selects the image for your machine's architecture. If the GHCR package is private, authenticate with `docker login ghcr.io` using credentials with package read access before pulling it.

The example binds port `3001` to the host's loopback interface, ready for local access, a reverse proxy, or Tailscale Funnel.

Inspect startup logs and check the HTTP endpoint:

```bash
docker logs -f telegram-to-rss
curl http://127.0.0.1:3001/
```

Once initialization succeeds, the root endpoint responds with `Hello Express!`.

## Configuration

| Variable | Purpose |
| --- | --- |
| `MONGO_URI` | MongoDB connection string, including authentication options. |
| `MONGO_DB` | Database used for users, channel subscriptions, and saved posts. |
| `AUTH_SECRET` | Secret required by the application's startup validation. |
| `TELEGRAM_API_ID` | Telegram application API ID. |
| `TELEGRAM_API_HASH` | Telegram application API hash. |
| `TELEGRAM_SESSION_KEY` | Authenticated Telegram account session generated by the helper. |
| `BOT_CLIENT_TOKEN` | Token for the bot used to manage subscriptions. |
| `DEEPSEEK_API_KEY` | API key used to generate headlines from message text. |
| `BASE_URL` | Reader-facing base URL for feeds and downloaded images. |

The application connects and authenticates using `MONGO_URI`. The separate `MONGO_USERNAME` and `MONGO_PASSWORD` entries in the example environment file are not read by the application.

## Deploy with Dokploy

Create an **Application** using the Docker provider and select:

```text
ghcr.io/denispalchuk/telegram-to-rss:latest
```

Add the environment variables above, configure persistent volumes at `/app/rss` and `/app/public`, and run **one replica** for the bot instance. Your MongoDB can stay outside Dokploy.

For Funnel running on the deployment VM, publish container port `3001` as host port `3001` using TCP. Configure GHCR credentials in Dokploy if the image is private.

### Public HTTPS with Tailscale Funnel

Run Tailscale on the same host or VM that runs the application. Once that machine is connected to your tailnet, enable Funnel:

```bash
sudo tailscale funnel --bg 3001
```

Follow the approval flow if prompted. Funnel prints an HTTPS address such as:

```text
https://telegram-rss.your-tailnet.ts.net
```

Use that address as `BASE_URL` before the first application deployment. Funnel forwards requests to `http://127.0.0.1:3001`, handles public HTTPS, and resumes after restarts when configured with `--bg`. RSS readers can reach the address without installing Tailscale. See the [Funnel documentation](https://tailscale.com/docs/reference/tailscale-cli/funnel) for prerequisites and configuration.

## Keep your reading history

The application stores article data and image files separately:

| Location | Contains | Migration |
| --- | --- | --- |
| MongoDB | `users`, `channels`, and `messages`, including post text, titles, dates, and image filenames. | Keep all three collections and their original IDs. |
| `/app/public` | Downloaded images. | Copy the files with their original filenames. |
| `/app/rss` | Generated XML feeds. | Can be rebuilt after a successful channel refresh. |

**Moving the database keeps the saved posts. Moving the images keeps the complete reading experience.**

If you migrate only MongoDB, article text survives, but old image links return `404`. Already processed messages are skipped, so missing images are not automatically downloaded again. You can restore the image directory later.

## How it works

1. **Subscribe.** The bot saves your channel subscriptions in MongoDB.
2. **Fetch.** The Telegram SDK retrieves the latest 20 messages from each channel.
3. **Group.** Media album messages are combined, and already stored entries are filtered out.
4. **Prepare.** New photos are downloaded, message text is combined, and DeepSeek generates a headline for posts with text.
5. **Publish.** Stored and new posts are assembled into RSS 2.0 XML, served by Express alongside the image files.

The instance refreshes channels on startup and fetches a newly added channel immediately. Repeated channel subscriptions share a channel feed and stored message history.

### Current behavior to know

- **Fetch window:** each refresh retrieves the latest 20 messages. Initial setup does not import the entire channel archive, and posts outside that window can be missed between refreshes.
- **Schedule:** the current cron expression is `* 6 * * *`, which refreshes every minute from **06:00 through 06:59**, using the process's timezone. To refresh once at 06:00, change it to `0 6 * * *` in [src/index.ts](./src/index.ts).
- **Existing posts:** saved messages are skipped on later fetches; edits and deletions in Telegram are not synchronized.
- **Media:** the public file route currently accepts UUID-named `.jpg` files. Image documents with other extensions may be downloaded but are not served by that route. Video and audio are not included.
- **Access:** feed URLs contain a user ID. The HTTP route checks that the user exists, but does not enforce channel ownership or require a login; a user-specific URL is not an access-control boundary.
- **Removal:** removing a channel subscription also deletes its shared saved posts and XML feed, which can affect other users subscribed to that channel.

## Local development

With dependencies installed and `.env` configured, start the TypeScript application directly:

```bash
node --env-file=.env --import tsx src/index.ts
```

Or restart it automatically when files change:

```bash
node --env-file=.env --import tsx --watch src/index.ts
```

The `npm start` script assumes environment variables are already present in the process; it does not load `.env` automatically. The container receives them through Docker or your deployment platform.

| Layer | Technology |
| --- | --- |
| Runtime | Node.js, TypeScript, tsx |
| Channel access | Telegram SDK (`telegram`) |
| Bot interface | grammY |
| HTTP | Express |
| Storage | MongoDB + filesystem volumes |
| Headlines | DeepSeek API + Mustache prompt template |
| Feeds | `feed` library, RSS 2.0 |
| Scheduling | `node-schedule` |

## Container builds

[GitHub Actions](./.github/workflows/publish-image.yml) builds and publishes a single image with `linux/amd64` and `linux/arm64` variants on pushes to `master`, `v*` version tags, and manual runs.

| Tag | Published for |
| --- | --- |
| `latest` | Default branch builds. |
| `master` | Builds from the `master` branch. |
| `sha-<commit>` | A build associated with a specific commit. |
| `1.2.3`, `1.2`, `1` | Semantic version tags such as `v1.2.3`. |

The [Dockerfile](./Dockerfile) installs native build tools temporarily so dependencies can compile on ARM64, then removes those tools before completing the image.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| The app fails during startup | Required environment variables, MongoDB connectivity, and the Telegram session. |
| A channel cannot be added | Channel identifier and access for the Telegram account behind the session. |
| Headline generation fails | DeepSeek credentials and API responses in the application logs. |
| A feed has not updated | Startup refresh logs, the current refresh schedule, and the 20-message fetch window. |
| Images are missing after migration | The `/app/public` volume, original filenames, and `BASE_URL`. |

## License

ISC, as declared in [package.json](./package.json).
