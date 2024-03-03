const { TelegramClient, Api } = require("telegram");
const { StringSession } = require("telegram/sessions");
const input = require("input");

const apiId = parseInt(process.env.API_ID, 10);
const apiHash = process.env.API_HASH;
const sessios = process.env.SESSION;
const stringSession = new StringSession(sessios); // fill this later with the value from session.save()

(async () => {
  console.log("Loading interactive example...");
  const client = new TelegramClient(stringSession, apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.start({
    phoneNumber: async () => await input.text("Please enter your number: "),
    password: async () => await input.text("Please enter your password: "),
    phoneCode: async () =>
      await input.text("Please enter the code you received: "),
    onError: (err) => console.log(err),
  });
  console.log("You should now be connected.");
  console.log(client.session.save()); // Save this string to avoid logging in
  const entity = await client.getEntity("nikitonsky_pub");

  for await (const message of client.iterMessages(entity, {
    limit: 2,
  })) {
    console.log(message);
  }
})();
