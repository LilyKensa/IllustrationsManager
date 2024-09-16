import dc from "discord.js";
import crypto from "node:crypto";

import * as DataManager from "./data";

export const config = {
  prefix: process.env.DISCORD_COMMAND_PREFIX!,
  admins: JSON.parse(process.env.DISCORD_ADMIN_IDS!) as string[]
};

export async function parseArgs(rawContent: string) {
  const rawArgs = rawContent.slice(config.prefix.length).split(" ");

  let args = new Array<string>();
  for (let i = 0; i < rawArgs.length; ++i) {
    if (rawArgs[i].startsWith("\"")) {
      for (let j = i; true; ++j) {
        if (j >= rawArgs.length) 
          throw new Error("Unpaired quotes");
        if (rawArgs[j].endsWith("\"")) {
          args.push(rawArgs.slice(i, ++j).join(" ").slice(1, -1))
          break;
        }
      }
    }
    else args.push(rawArgs[i]);
  }

  return args;
}

export async function fetchArgs(fullArgs: string[], count: number, defaults?: string[]) {
  let args = fullArgs.slice(1);

  if (args.length < count) {
    if (!defaults)
       throw new Error(`Not enough argument, ${args.length}/${count}`);

    do {
      if (defaults[args.length] === null)
        throw new Error(`Argument no. ${args.length} is required`);
      args.push(defaults[args.length]);
    }
    while (args.length < count);
  }

  return args;
}

export async function handle(msg: dc.Message) {  
  const safely = (p: Promise<any>) => p.catch((err) => msg.reply(`Encountered error: ${err.message}`));

  let args = await safely(parseArgs(msg.content));

  switch (args[0]) {
    case "loli":
      msg.reply("Roger's favorite!");
      break;

    case "worship":
      let [ who ] = await safely(fetchArgs(args, 1, [`<@${msg.author.id}>`]));
      msg.reply(`${who} 🛐 🛐 🛐`);
      break;

    case "import":
      const reMsg = await msg.reply("Importing...");
      let result = await DataManager.importImages();
      reMsg.reply([
        "Done!",
        result.oldCount, 
        "->", 
        result.newCount + ",",
        result.addedCount,
        "added,",
        result.duplicatedCount, 
        "duplicated"
      ].join(" "));
      break;

    case "random":
      const imageList = await DataManager.list();
      const image = imageList[crypto.randomInt(0, imageList.length)];

      msg.reply({ 
        embeds: [
          new dc.EmbedBuilder()
            .setColor(image.color)
            .setImage(`attachment://${image.path}`)
            .setFooter({
              text: `${image.path} - ${image.info.width} × ${image.info.height} (${(image.info.size / 1000).toFixed(2)} KB)`
            })
        ],
        files: [
          new dc.AttachmentBuilder(`./public/illustrations/images/${image.path}`, { name: image.path })
        ] 
      });
      break;

    case "add":
      if (!config.admins.includes(msg.author.id)) {
        msg.reply("You don't have the permission to use this command lol");
        break;
      }

      const rfrMsg = await msg.fetchReference();
      if (!rfrMsg) break;
      
      for (let file of rfrMsg.attachments.values())
        await safely(DataManager.download(file.url));
      
      const urlRegex = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9@:%_\+.~#?&//=]*)\.(?:jpg|jpeg|png|gif|bmp|webp|heic)(?:\?.*)?/g;
      for (let url of rfrMsg.content.match(urlRegex) ?? [])
        await safely(DataManager.download(url));
      
      rfrMsg.react("☑️");
      break;

    case "clearmessages":
    case "cmsg":
      if (!config.admins.includes(msg.author.id)) {
        msg.reply("You don't have the permission to use this command lol");
        break;
      }

      let [ deleteFromId, deleteToId ] = await safely(fetchArgs(args, 2, []));
      if (Number.parseInt(deleteFromId) > Number.parseInt(deleteToId)) {
        msg.reply("Error: The starting point is after the end point");
        break;
      }

      let beforeDeleteFromId = (await msg.channel.messages.fetch({
        before: deleteFromId,
        limit: 1
      })).at(0)!.id;

      for (let m of (await msg.channel.messages.fetch({
        after: beforeDeleteFromId,
        before: deleteToId
      })).values()) {
        if (m.id > deleteToId) continue;
        await m.delete();
        await new Promise(r => setTimeout(r, 1000));
      }
  }
}
