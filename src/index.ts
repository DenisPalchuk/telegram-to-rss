import { Hono } from "hono";
import { Bindings, Variables, initLayers } from "./init";

const app = new Hono<{ Bindings: Bindings & Variables }>();

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.post("/signup", async (c) => {
  const { usersService } = initLayers(c);
  const { password, email } = await c.req.json();

  const token = await usersService.register(email, password);

  if (token) {
    c.status(201);
    return c.json({
      token,
    });
  } else {
    c.status(500);
    return c.text("Something went wrong");
  }
});

app.post("/signin", async (c) => {
  const { usersService } = initLayers(c);
  const { password, email } = await c.req.json();

  const token = await usersService.login(email, password);

  if (token) {
    c.status(201);
    return c.json({
      token,
    });
  } else {
    c.status(500);
    return c.text("Something went wrong");
  }
});

export default app;
