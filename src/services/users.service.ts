import { UsersDao } from "../dao/users.dao";
import bcrypt from "bcryptjs";
import { TokenService } from "./token.service";

export class UsersService {
  constructor(
    private readonly usersDao: UsersDao,
    private readonly tokenService: TokenService
  ) {}

  async register(email: string, password: string): Promise<string | null> {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const uuid = crypto.randomUUID();

    const result = await this.usersDao.create(uuid, email, hash);

    if (!result.success) {
      return null;
    }

    return this.tokenService.generateToken(email, uuid);
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

    return this.tokenService.generateToken(email, user.id);
  }
}
