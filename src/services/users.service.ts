import { UsersDao } from "../dao/users.dao";
import bcrypt from "bcryptjs";
import { sign } from "hono/jwt";

export class UsersService {
  constructor(
    private readonly usersDao: UsersDao,
    private readonly AUTH_SECRET: string
  ) {}

  async register(email: string, password: string): Promise<string | null> {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const result = await this.usersDao.create(email, hash);

    if (!result.success) {
      return null;
    }

    const token = await sign({ email }, this.AUTH_SECRET);

    return token;
  }

  async login(email: string, password: string) {
    const user = await this.usersDao.readOne(email);
    if (!user) {
      return null;
    }

    const compareResult = await bcrypt.compare(password, user.password);

    if (!compareResult) {
      return null;
    }

    console.log(this.AUTH_SECRET);
    const token = await sign(
      {
        email,
      },
      this.AUTH_SECRET
    );
    return token;
  }
}
