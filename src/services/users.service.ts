import { UsersDao } from "../dao/user.dao";

export class UsersService {
  constructor(private readonly usersDao: UsersDao) {}

  async createUser(tgId: number): Promise<boolean> {
    const result = await this.usersDao.create(tgId);

    if (!result.acknowledged) {
      return false;
    }

    return true;
  }

  async getUserById(id: string) {
    return this.usersDao.getOneById(id);
  }

  async getUserByTgId(tgId: number) {
    return this.usersDao.getOneByTgId(tgId);
  }
}
