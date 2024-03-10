-- Migration number: 0000 	 2024-03-10T20:34:24.487Z
CREATE TABLE IF NOT EXISTS "users" (
  "id" text NOT NULL ,
  "email" text  NOT NULL ,
  "password" text  NOT NULL ,
  PRIMARY KEY (id)
);
