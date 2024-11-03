import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function verifyAuth() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    console.log("auth middleware");

    if (!authHeader) {
      console.log("No auth header provided.");
      res.status(401).send("No auth header provided.");
      return;
    }

    const token = authHeader.replace("Bearer ", "");

    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      console.log("No secret provided");
      throw new Error("No secret provided");
    }

    console.log("trying to verify token", token);
    try {
      const decodedPayload = jwt.verify(token, secret);
      console.log("decodedPayload", decodedPayload);
      req.user = decodedPayload;
      next();
    } catch (err) {
      console.log("invalid payload", err);
      res.status(401).send({
        error: "Invalid payload",
      });
      return;
    }
  };
}
