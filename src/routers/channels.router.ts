import { Hono } from "hono";
import { Bindings, Variables, initLayers } from "../init";
import { verifyAuth } from "./middlewares/auth.middleware";

const app = new Hono<{ Bindings: Bindings & Variables }>();

app.use("*", verifyAuth());
app.post("/", async (c) => {
  const { channelsService } = initLayers(c);

  const body = await c.req.json();

  const user = c.get("jwtPayload");
  const result = await channelsService.addChannel(body.channelId, user.userId);
  if (!result) {
    c.status(500);
    c.text("Add channel operation failed");
  }

  return c.json(result);
});

app.get("/:channelId/posts", async (c) => {
  const channelId = c.req.param("channelId");
  
});

export default app;
