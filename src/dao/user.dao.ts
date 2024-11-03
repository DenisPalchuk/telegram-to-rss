import { Collection, Db } from "mongodb";
import { User } from "../entities/user";

export class UsersDao {
  usersCollection: Collection<User>;
  constructor(db: Db) {
    this.usersCollection = db.collection<User>("users");
  }

  async create(uuid: string, email: string, passwordHash: string) {
    return this.usersCollection.insertOne({
      id: uuid,
      email,
      password: passwordHash,
    });
  }

  async readOne(email: string) {
    return this.usersCollection.findOne<User>({ email });
  }
}
