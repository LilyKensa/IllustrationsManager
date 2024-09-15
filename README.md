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
