import { sign } from "hono/jwt";

export class TokenService {
  constructor(private readonly AUTH_SECRET: string) {}
  async generateToken(email: string, userId: string) {
    const now = new Date();
    return await sign(
      {
        userId,
        iat: Math.floor(now.getTime() / 1000),
        exp: Math.floor(now.setDate(now.getDate() + 1) / 1000),
        email,
      },
      this.AUTH_SECRET
    );
  }
}
