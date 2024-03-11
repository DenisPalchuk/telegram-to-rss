-- Migration number: 0002 	 2024-03-11T15:18:30.680Z
CREATE TABLE IF NOT EXISTS "channels" (
  "id" text NOT NULL ,
  "channelId" text  NOT NULL ,
  "userId" text  NOT NULL ,
  "lastMessageId" text,
  PRIMARY KEY (id),
  UNIQUE (channelId, userId) ON CONFLICT FAIL
);
