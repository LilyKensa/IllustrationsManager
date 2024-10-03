import fs, { promises as fsp } from "node:fs";

import * as DataManager from "./modules/data";
import * as ImageManager from "./modules/image";

async function main() {
  console.time("Rehashed");
  console.log("Rehashing...");

  let data = await DataManager.getImagesData();

  for (let [ i, img ] of data.entries()) {
    console.time(img.path);

    let newHash = await ImageManager.hash(`./public/illustrations/images/${img.path}`);

    for (let ii = 0; ii < i; ++ii)
      if (data[ii].hash === newHash)
        console.log(`[D] ${data[ii].path} & ${img.path}`);

    data[i].hash = newHash;

    console.timeEnd(img.path);
  }
  
  DataManager.setImagesData(data);

  console.timeEnd("Rehashed");
}

main();
