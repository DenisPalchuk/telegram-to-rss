import express from "express";
import { initLayers } from "../init";
import { UsersService } from "../services/users.service";

export const getAuthRouter = (usersService: UsersService) => {
  const router = express.Router();

  router.post("/signup", async (req, res, next) => {
    try {
      const { password, email } = req.body;

      const token = await usersService.register(email, password);

      if (token) {
        res.status(201).json({
          token,
        });
      } else {
        res.status(500).send("Something went wrong");
      }
    } catch (err) {
      next(err);
    }
  });

  router.post("/signin", async (req, res, next) => {
    try {
      const { usersService } = await initLayers();
      const { password, email } = req.body;

      const token = await usersService.login(email, password);

      if (token) {
        res.status(201).json({
          token,
        });
      } else {
        res.status(500).send("Something went wrong");
      }
    } catch (error) {
      next(error);
    }
  });

  return router;
};
