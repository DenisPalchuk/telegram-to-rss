interface User {
  email: string;
  uuid: string;
  password: string;
}

export class UsersDao {
  constructor(private readonly db: D1Database) {}

  async create(email: string, passwordHash: string) {
    const uuid = crypto.randomUUID();

    return this.db
      .prepare(`INSERT INTO users (id, email, password) VALUES (?, ?, ?)`)
      .bind(uuid, email, passwordHash)
      .run();
  }

  async readOne(email: string) {
    return this.db
      .prepare("SELECT * FROM USERS WHERE email = ?")
      .bind(email)
      .first<User>();
  }
}
