import { Collection, Db, ObjectId, WithId } from "mongodb";
import { User } from "../entities/user";

export class UsersDao {
  usersCollection: Collection<User>;
  constructor(db: Db) {
    this.usersCollection = db.collection<User>("users");
  }

  async create(email: string, passwordHash: string) {
    return this.usersCollection.insertOne({
      email,
      password: passwordHash,
    });
  }

  async readOne(email: string) {
    return this.usersCollection.findOne<WithId<User>>({ email });
  }

  async getOneById(id: string) {
    return this.usersCollection.findOne<User>({ _id: new ObjectId(id) });
  }
}
