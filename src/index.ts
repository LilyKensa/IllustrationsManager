import dc from "discord.js";
import dotenv from "dotenv";

dotenv.config();

import { checkEnv } from "./modules/env";

checkEnv();

import * as CommandManager from "./modules/commands";
import * as DataManager from "./modules/data";
import * as WebsiteManager from "./modules/express";

const client = new dc.Client({
  intents: [
    dc.GatewayIntentBits.Guilds,
    dc.GatewayIntentBits.GuildMessages,
    dc.GatewayIntentBits.MessageContent
  ]
});

client.on(dc.Events.ClientReady, async (c) => {
  c.user.setPresence({
    status: "idle",
    activities: [
      { type: dc.ActivityType.Watching, name: "laughter and tears" }
    ]
  });
  console.log(`@${c.user.tag} is online!`);
});

client.on(dc.Events.MessageCreate, async (msg) => {
  if (msg.content.startsWith(CommandManager.config.prefix))
    CommandManager.handle(msg).catch(console.error); 
    // TODO ^ Fix the `DOMException [AbortError]: This operation was aborted` when uploading big images
});


async function main() {
  console.log("Initializing images...");
  await DataManager.init();
  
  console.log("Starting express app...");
  await WebsiteManager.startServer();

  console.log("Starting discord bot...");
  client.login(process.env.DISCORD_BOT_TOKEN);
}

main();
