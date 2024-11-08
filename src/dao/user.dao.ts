import { Collection, Db, ObjectId, WithId } from "mongodb";
import { User } from "../entities/user";

export class UsersDao {
  usersCollection: Collection<User>;
  constructor(db: Db) {
    this.usersCollection = db.collection<User>("users");
  }

  async create(tgId: number) {
    return this.usersCollection.insertOne({
      tgId,
    });
  }

  async getOneByTgId(tgId: number) {
    return this.usersCollection.findOne<WithId<User>>({ tgId });
  }

  async getOneById(id: string) {
    return this.usersCollection.findOne<User>({ _id: new ObjectId(id) });
  }
}
