import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function verifyAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).send("No auth header provided.");
      next();
      return;
    }

    const token = authHeader.replace("Bearer ", "");

    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      throw new Error("No secret provided");
    }

    try {
      const decodedPayload = jwt.verify(token, secret);
      req.user = decodedPayload;
      next();
    } catch (err) {
      res.status(401).send("invalid payload");
      next();
      return;
    }
  };
}
