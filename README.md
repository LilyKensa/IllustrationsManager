# Huey's Gallery Website & Discord Bot

by Huey☆

## About

This project runs a discord bot to download pictures from discord, and a website to display them.

![Screenshot](screenshot.png)

## Installation

First, clone the repo and install node.js packages.

```sh
git clone git@github.com:LilyKensa/IllustrationsManager.git
cd IllustrationManagerBot
npm install
```

Then, edit the environment variables

```sh
mv .env.dev .env
vim .env
```

Follow the instructions in `.env`, and you're good to go!

```sh
./run.sh
```

The discord client should be online, and your website should be hosted on `localhost:5470/illustrations/` (Or other port if you changed it)

## Discord Commands

### Misc

I made `--loli` command to troll one of my friend, you can use this as a ping command though.

Don't ever use `--worship`. Trust me.

## Admin

Admin are those who can manage the images.

### Discord

Reply to a message and type `--add` will add all the images (including URLs and attachments) of that image. You will see a ☑️ appear to the message.

Use `--delete <id>` to delete an image.

Using `--clearmessages <begin> <end>`, you can delete a range of message at once, be careful when using this.

|Commands|Aliases|
|-|-|
|`--delete`|`--del`|
|`--clearmessages`|`--cmsg`|

### Website

Click on the login logo and enter the password you set in `.env` to log yourself in.

And now you can drag and drop images onto the website to upload it!

※ Remember to `--import`.

## Change Log

### v1.1

- `--delete` command
- Better image hashing
- Pixiv download support (including [ppixiv](https://github.com/ppixiv/ppixiv/) plugin page specification)
- Error pages
- Page footer

### v1.2

- Fixed pixiv download twice
- Add options
  - Image sort method
  - Force compact / full display mode
  - Filter aspect ratio

### v1.3

- Really fixed pixiv download twice
- Added drag and drop feature to website
- Added `--clearmessage` permissions check
