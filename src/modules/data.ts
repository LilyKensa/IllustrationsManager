import fs, { promises as fsp } from "node:fs";
import axios from "axios";

import * as ImageManager from "./image";

export interface ImageInfo { 
  path: string, 
  hash: string,
  color: `#${string}`,
  info: {
    width: number,
    height: number,
    size: number
  }
};

export async function getCurrentIndex() {
  return Number.parseInt((await fsp.readFile("./data/currentIndex.txt")).toString())
}

export async function getImagesData(): Promise<ImageInfo[]> {
  return JSON.parse((await fsp.readFile("./data/imagesData.json")).toString());
}
export async function setImagesData(data: ImageInfo[]) {
  await fsp.writeFile("./data/imagesData.json", JSON.stringify(data, null, 2));
}

export async function init() {
  for (let folder of [ "./data/", "./private/images_input", "./private/images_duplicated", "./private/images_deleted", "./public/illustrations/images", "./public/illustrations/images_compressed" ])
    if (!fs.existsSync(folder))
      await fsp.mkdir(folder, { recursive: true });
  
  for (let file of [
    { path: "./data/imagesData.json",  content: "[]" }, 
    { path: "./data/currentIndex.txt", content: "-1" }
  ])
    if (!fs.existsSync(file.path))
      await fsp.writeFile(file.path, file.content);

  await importImages();

  console.log("Images initialized.");
}

export async function importImages() {
  let index = await getCurrentIndex();
  let imagesData = await getImagesData();

  let oldCount = imagesData.length, newCount = oldCount, count = 0, duplicatedCount = 0;

  try {
    for (let file of await fsp.readdir("./private/images_input")) {
      index++;
      count++;

      const oldPath = `./private/images_input/${file}`;
      const oldBuffer = await fsp.readFile(oldPath);
      
      const buffer = await ImageManager.convert(oldBuffer);
      
      let hash  = await ImageManager.hash(buffer);
      let color = await ImageManager.dominantColor(buffer);

      const newName = `${index}.png`;
      
      if (imagesData.findIndex(img => img.hash === hash) !== -1) {
        duplicatedCount++;
        await fsp.unlink(oldPath);
        await fsp.writeFile(`./private/images_duplicated/${newName}`, buffer);
        continue;
      }

      await fsp.unlink(oldPath);
      await fsp.writeFile(`./public/illustrations/images/${newName}`, buffer);

      imagesData.push({ path: newName, hash, color, info: await ImageManager.info(buffer) });

      await new Promise(r => setTimeout(r, 100));
    }
  }
  catch (err) {
    console.error(err);
  }
  finally {
    await fsp.writeFile("./data/currentIndex.txt", index.toString());
    setImagesData(imagesData);
  }

  await compressImages();
  
  newCount += count;
  return { newCount, oldCount, addedCount: count - duplicatedCount, duplicatedCount };
}

export async function compressImages() {
  for (let file of await fsp.readdir("./public/illustrations/images/")) {
    if (fs.existsSync(`./public/illustrations/images_compressed/${file}`)) continue;
    await fsp.writeFile(
      `./public/illustrations/images_compressed/${file}`,
      await ImageManager.compress(`./public/illustrations/images/${file}`)
    );  
  }
}

export async function list() {
  let imagesData = await getImagesData();
  return imagesData;
}

export async function read(path: string) {
  const fullPath = `./public/illustrations/images/${path}`;
  if (fs.existsSync(fullPath)) 
    return fsp.readFile(fullPath);
  return null;
}

export async function del(path: string) {
  const fullPath = `./public/illustrations/images/${path}`;

  let data = await getImagesData();

  let index = data.findIndex(d => d.path === path);
  if (index === -1) throw new Error("Image does not exist");

  data.splice(index, 1);
  setImagesData(data);

  fs.unlinkSync(`./public/illustrations/images_compressed/${path}`);
  fs.renameSync(fullPath, `./private/images_deleted/${path}`);

  return true;
}

export async function download(url: string) {
  return axios.get(url, {
    responseType: "arraybuffer"
  }).then(async r => {
    if (!(r.headers["content-type"] as string).startsWith("image/"))
      throw new Error(`The URL \`${url}\` does not provide an image source`);

    let imageName = Math.floor((Date.now() + Math.random()) * 100);
    let imageType = (r.headers["content-type"] as string).slice("image/".length);

    await fsp.writeFile(
      `./private/images_input/${imageName}.${imageType}`,
      r.data
    );
  });
}
