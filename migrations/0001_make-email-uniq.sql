-- Migration number: 0001 	 2024-03-10T22:27:57.762Z
CREATE UNIQUE INDEX users_email_index ON users(email);
