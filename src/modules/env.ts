export function reject(msg: string) {
  console.error("Invalid environment: " + msg);
  process.exit(1);
}

export function checkEnv() {
  if (!process.env.I_AM_NOT_DUMB)
    reject("Read the README.md first! you need to rename `.env.dev` to `.env` and check the contents!")
  if (!process.env.IMAGE_COMPRESS_QUALITY)
    reject("`IMAGE_COMPRESS_QUALITY` required!");
  if (Number.isNaN(Number.parseInt(process.env.IMAGE_COMPRESS_QUALITY!)))
    reject("`IMAGE_COMPRESS_QUALITY` needs to be a number!");
  if (Number.parseInt(process.env.IMAGE_COMPRESS_QUALITY!) <= 0)
    reject("`IMAGE_COMPRESS_QUALITY` needs to be greater than zero!");
  if (!process.env.DISCORD_BOT_TOKEN || /[^x]/.test(process.env.DISCORD_BOT_TOKEN!) === null)
    reject("`DISCORD_BOT_TOKEN` required!");
  if (!process.env.DISCORD_COMMAND_PREFIX || process.env.DISCORD_COMMAND_PREFIX!.length <= 0)
    reject("`DISCORD_COMMAND_PREFIX` required!");
  if (!process.env.GALLERY_SERVER_PORT)
    reject("`GALLERY_SERVER_PORT` required!");
  if (Number.isNaN(Number.parseInt(process.env.GALLERY_SERVER_PORT!)))
    reject("`GALLERY_SERVER_PORT` needs to be an number!");
  let port = Number.parseInt(process.env.GALLERY_SERVER_PORT!);
  if (port < 1024)
    console.warn("`GALLERY_SERVER_PORT`: Ports below 1024 is preserved!");
  if (port >= 65536)
    reject("`GALLERY_SERVER_PORT`: There's no such port, since there're only 65535 ports!");
  if (!process.env.GALLERY_TITLE)
    console.warn("Strange environment: `GALLERY_TITLE` is empty");
  if (!process.env.GALLERY_HEADER)
    console.warn("Strange environment: `GALLERY_HEADER` is empty");
  if (!process.env.GALLERY_UPLOAD_PASSWORD)
    console.warn("Strange environment: `GALLERY_UPLOAD_PASSWORD` is empty");
}
