import { ObjectId } from "mongodb";

export interface User {
  email: string;
  id: string;
  password: string;
}
