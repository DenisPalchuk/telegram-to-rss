-- Migration number: 0003 	 2024-03-11T17:03:30.835Z
ALTER TABLE channels DROP COLUMN lastMessageId;
ALTER TABLE channels ADD COLUMN lastMessageDateTime int8;
