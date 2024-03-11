const input = require("input");

const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");

const { TELEGRAM_API_ID, TELEGRAM_API_HASH } = process.env;

const getSessionKey = async () => {
  const client = new TelegramClient(
    new StringSession(""),
    parseInt(TELEGRAM_API_ID, 10),
    TELEGRAM_API_HASH
  );
  await client.start({
    phoneNumber: async () => await input.text("Please enter your number: "),
    password: async () => await input.text("Please enter your password: "),
    phoneCode: async () =>
      await input.text("Please enter the code you received: "),
    onError: (err) => console.error(err),
  });

  console.info("You should now be connected.");

  const sessionKey = client.session.save();

  console.info("session key", sessionKey);

  return sessionKey;
};

getSessionKey();
