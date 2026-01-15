# Telegram to RSS Converter

## Project Overview

This is a Node.js application that converts Telegram channels into RSS feeds. Users can subscribe to Telegram channels through a Telegram bot, and the application automatically generates RSS feeds from channel messages, including support for media and grouped messages.

## Purpose

Allows users to:
- Monitor Telegram channels via RSS readers
- Convert Telegram channel content into a standardized RSS feed format
- Access channel messages with images and grouped media through RSS

## Technology Stack

- **Runtime**: Node.js with TypeScript
- **Telegram Integration**:
  - `telegram` SDK for fetching channel messages
  - `grammy` for the Telegram bot interface
- **Web Framework**: Express.js
- **Database**: MongoDB
- **AI**: Anthropic Claude API (for message summarization)
- **RSS**: `feed` library for generating RSS XML
- **Task Scheduling**: `node-schedule` for periodic updates

## Coding Conventions

### Comments
- **Do not add comments to code** unless explicitly requested by the user
- Code should be self-documenting through clear variable names, function names, and structure
- Only add comments when the logic is genuinely non-obvious and cannot be clarified through refactoring

## Architecture

### Layer Structure

```
┌─────────────────────────────────────┐
│         Express Server              │
│   (HTTP endpoints + static files)   │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│        Telegram Bot (Grammy)        │
│  (User interaction via Telegram)    │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│          Services Layer             │
│  - ChannelsService                  │
│  - TelegramService (SDK)            │
│  - RssService                       │
│  - AIService                        │
│  - UsersService                     │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│          DAO Layer                  │
│  - ChannelsDao                      │
│  - MessagesDao                      │
│  - UsersDao                         │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│           MongoDB                   │
└─────────────────────────────────────┘
```

## Key Components

### 1. Telegram Bot (`src/bot/bot.ts`)
- Built with Grammy framework
- Provides user interface via Telegram commands:
  - `/start` - Initialize user account
  - `/channels` - List subscribed channels
  - `/add` - Add new channel subscription
  - `/remove` - Remove channel subscription
  - `/feed` - Get RSS feed URLs
- Uses session management for conversational flows

### 2. Channels Service (`src/services/channels.service.ts`)
Core business logic for channel management:
- **Adding channels**: Validates and adds Telegram channels
- **Refreshing channels**: Fetches latest messages and generates RSS feeds
- **Message processing**:
  - Downloads media (images)
  - Groups related messages (media albums)
  - Generates titles using AI
  - Creates RSS items with content and images
- **Scheduled updates**: Runs daily at 6 AM to refresh all channels

### 3. Telegram Service (`src/services/telegram.service.ts`)
Wrapper around Telegram SDK:
- Fetches channel messages
- Retrieves channel information
- Downloads media (photos, documents)
- Handles grouped media messages

### 4. RSS Service (`src/services/rss.service.ts`)
- Generates RSS XML feeds from message items
- Uses `feed` library for RSS 2.0 format

### 5. AI Service (`src/services/ai.service.ts`)
- Uses Anthropic Claude API (claude-3-5-haiku model)
- Summarizes message text into one-sentence titles (up to 100 chars)
- Includes retry logic with exponential backoff for API reliability
- Handles DNS and connection errors gracefully

### 6. Message Grouping (`src/services/message-grouping.helper.ts`)
Helper functions for handling Telegram message groups:
- **organizeMessagesIntoGroups**: Groups messages by `groupedId` (for media albums)
- **filterNewMessageGroups**: Filters out already processed messages
- **squashMessageGroup**: Combines multiple messages in a group into a single RSS item

### 7. Data Access Objects (DAOs)
- `ChannelsDao`: CRUD operations for channels
- `MessagesDao`: CRUD operations for messages (backup/cache)
- `UsersDao`: User management

## Data Flow

### Adding a Channel
1. User sends `/add` command to bot
2. Bot prompts for channel link
3. User provides channel ID/link
4. ChannelsService validates channel with Telegram API
5. Channel saved to MongoDB
6. Initial message fetch and RSS generation triggered

### RSS Feed Generation
1. **Scheduled job** (daily at 6 AM) or manual trigger
2. For each channel:
   - Fetch last 20 messages from Telegram
   - Organize messages into groups (singles + grouped media)
   - Filter out already processed messages
   - For each new message/group:
     - Download media (images)
     - Combine text from grouped messages
     - Generate title using AI
     - Create RSS item with content + images
   - Combine old and new items
   - Generate RSS XML file
   - Save to `rss/{channelId}.xml`
   - Backup messages to MongoDB

### Serving RSS Feeds
- RSS files served via `/rss/:userId/:channelId.xml`
- Images served from `/public` directory
- Filename validation for security (UUID + .jpg pattern only)

## Directory Structure

```
telegram-to-rss/
├── src/
│   ├── bot/
│   │   └── bot.ts                    # Telegram bot implementation
│   ├── dao/
│   │   ├── channels.dao.ts           # Channel data access
│   │   ├── messages.dao.ts           # Message data access
│   │   └── user.dao.ts               # User data access
│   ├── entities/
│   │   ├── channel.ts                # Channel & Message types
│   │   ├── feed.ts                   # Feed types
│   │   └── user.ts                   # User types
│   ├── routers/
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts    # Authentication
│   │   │   └── errors.middleware.ts  # Error handling
│   │   └── rss.router.ts             # RSS endpoints
│   ├── services/
│   │   ├── ai.service.ts             # AI/Claude integration
│   │   ├── channels.service.ts       # Channel business logic
│   │   ├── message-grouping.helper.ts # Message grouping utilities
│   │   ├── rss.service.ts            # RSS generation
│   │   ├── telegram.service.ts       # Telegram SDK wrapper
│   │   └── users.service.ts          # User management
│   ├── index.ts                      # Application entry point
│   └── init.ts                       # Initialization & dependency injection
├── rss/                              # Generated RSS feed files
├── public/                           # Downloaded images (served statically)
├── docker-compose.yaml               # MongoDB setup
├── package.json
└── tsconfig.json
```

## Environment Variables

Required environment variables (see `.env.example`):
- `MONGO_URI` - MongoDB connection string
- `MONGO_DB` - MongoDB database name
- `AUTH_SECRET` - JWT secret for authentication
- `TELEGRAM_API_ID` - Telegram API credentials
- `TELEGRAM_API_HASH` - Telegram API credentials
- `TELEGRAM_SESSION_KEY` - Telegram session string
- `ANTHROPIC_API_KEY` - Claude API key
- `BOT_CLIENT_TOKEN` - Telegram bot token
- `BASE_URL` - Public URL for RSS feeds and images

## Key Features

### Message Grouping
Recent feature implementation (see recent commits):
- Groups messages by `groupedId` to handle Telegram media albums
- Preserves message order while grouping related messages
- Combines text from multiple messages in a group
- Associates all media from a group with a single RSS item
- Uses the first message ID for Telegram link generation

### Channel Removal
- Removes channel from database
- Deletes associated messages
- Cleans up RSS feed file

### Image Handling
- Downloads images from Telegram channels
- Stores with UUID filenames in `public/` directory
- Serves via Express static middleware with security validation
- Embeds images in RSS content with `<img>` tags
- First image used as RSS item thumbnail

### AI Summarization
- Generates concise titles from message content
- Russian language support
- Robust error handling with 20 retry attempts
- Exponential backoff for rate limiting

## Database Schema

### Collections

#### users
```typescript
{
  _id: ObjectId,
  tgId: number  // Telegram user ID
}
```

#### channels
```typescript
{
  userId: string,
  channelId: string,
  channelTitle: string,
  lastMessageDateTime: number | null
}
```

#### messages
```typescript
{
  messageId: string,      // groupId for groups, message.id for singles
  channelId: string,
  title: string,
  text: string,
  dateTime: number,
  imageFileNames?: string[],
  groupedId?: string      // Present if part of a group
}
```

## Recent Changes

Based on git history:
1. **Message Grouping Refactor**: Introduced `MessageGroup` abstraction to better handle grouped media and preserve message order
2. **Channel Removal Feature**: Added ability to remove channels with cleanup of associated data
3. **Message Processing Optimization**: Improved `groupMessagesByGroupId` to avoid redundant single message processing

## Running the Application

### Development
```bash
npm run start:dev
```

### Production
```bash
npm start
```

### Docker
MongoDB can be started via:
```bash
docker-compose up -d
```

## Important Notes

### Security
- RSS feed files are user-specific (URL includes userId)
- Image filenames validated with UUID regex pattern
- Path traversal protection on static file serving

### Rate Limiting
- 3-second delay between media downloads from same group
- AI service includes retry logic with exponential backoff

### Scheduling
- Cron expression: `* 6 * * *` (every day at 6 AM)
- All channels refreshed on application startup

### Message Processing
- Fetches last 20 messages per channel
- Only processes new messages (not in backup)
- Messages backed up to MongoDB after processing
- RSS feeds include both old (from DB) and new messages

## Troubleshooting

### Common Issues
1. **Channel not found**: Ensure bot has access to channel and channel ID is correct
2. **Image download fails**: Check Telegram API rate limits
3. **AI summarization fails**: Verify ANTHROPIC_API_KEY and check API quota
4. **RSS feed not updating**: Check scheduled job logs and Telegram connection

## File Naming Conventions

- Images: UUID v4 + extension (e.g., `550e8400-e29b-41d4-a716-446655440000.jpg`)
- RSS files: `{channelId}.xml` in `rss/` directory
- RSS URLs: `/rss/{userId}/{channelId}.xml`