interface ImageInfo {
  path: string,
  hash: string,
  color: `#${string}`,
  info: {
    width: number,
    height: number,
    size: number,
  },
};

interface LineData {
  aspectRatio: number,
  content: ImageInfo[]
}

function shuffle<T>(array: T[]) {
  let currentIndex = array.length;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {
    // Pick a remaining element...
    let randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }

  return array;
}

type HSL = {
  h: number;
  s: number;
  l: number;
};

function hexToHSL(hex: string): HSL {
  // Remove the leading '#' if present
  hex = hex.replace(/^#/, '');

  // Parse r, g, b values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  // Find min and max values to get lightness
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    switch (max) {
      case r:
        h = (g - b) / delta + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      case b:
        h = (r - g) / delta + 4;
        break;
    }
    h /= 6;
  }

  // Convert h, s, l to percentages and return
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function sortByColor<T extends { color: string }>(arr: T[]) {
  return arr.sort((a, b) => {
    // Convert the hex color to an integer for comparison
    const colorA = hexToHSL(a.color);
    const colorB = hexToHSL(b.color);

    // Sort based on the numerical value of the colors
    return 10 * colorA.h + colorA.l 
      - 10 * colorB.h - colorB.l 
      + (config.slightlyRandom ? Math.random() * 25 - 12.5 : 0);
  });
}

function loadImage(imageUrl: string, onProgress: (progress: number) => void, onLoad: (url: string) => void): XMLHttpRequest {
  const xhr = new XMLHttpRequest();
  let notifiedNotComputable = false;

  xhr.open("GET", imageUrl, true);
  xhr.responseType = "arraybuffer";

  xhr.addEventListener("progress", (ev) => {
    if (ev.lengthComputable) {
      onProgress(ev.loaded / ev.total);
    } 
    else {
      if (!notifiedNotComputable) {
        notifiedNotComputable = true;
        onProgress(-1);
      }
    }
  });

  xhr.addEventListener("loadend", (ev) => {
    if (!xhr.status.toString().match(/^2/)) 
      return;
    
    const options: { type?: string } = {}
    const headers = xhr.getAllResponseHeaders();
    const m = headers.match(/^Content-Type\:\s*(.*?)$/mi);

    if (m && m[1]) {
      options.type = m[1];
    }

    onLoad(window.URL.createObjectURL(
      new Blob([xhr.response], options)
    ));
  });

  xhr.send();

  return xhr;
}


//+================================================================================================+
//*============================================= main =============================================*
//+================================================================================================+

let originalData: ImageInfo[], data: ImageInfo[];

let config = {
  sort: "random",
  slightlyRandom: false,
  align: "auto",
  filter: "none"
}

fetch("/illustrations/data/").then(r => r.json()).then(json => {
  originalData = json;
  sort();

  restart();
  window.addEventListener("resize", restart);
});

function sort() {
  switch (config.sort) {
    case "random": {
      data = shuffle<ImageInfo>([ ... originalData ]);
      break;
    }
    case "id": {
      data = ([ ... originalData ] as ImageInfo[]).sort((a, b) => 
        Number.parseInt(a.path) 
        - Number.parseInt(b.path) 
        + (config.slightlyRandom ? 8 * Math.random() - 4 : 0)
      );
      break;
    }
    case "color": {
      data = sortByColor<ImageInfo>([ ... originalData ]);
      break;
    }
  }
}

function restart() {
  let container = document.querySelector<HTMLDivElement>(".gallery")!;
  // let containerWidth = container.getBoundingClientRect().width;
  let containerWidth = window.innerWidth - (window.innerWidth > 480 ? 12 : 0);

  function showFullscreenImage(ev: MouseEvent) {
    let fullscreenContainer = document.querySelector<HTMLDivElement>(".fullscreen-container")!,
      backdropEl = fullscreenContainer.querySelector<HTMLDivElement>(".backdrop")!,
      progressEl = document.querySelector<HTMLDivElement>(".progress")!;

    fullscreenContainer.style.pointerEvents = "all";

    let oldEl: HTMLDivElement = this as HTMLDivElement;
    let el = oldEl.cloneNode(true) as HTMLDivElement;

    fullscreenContainer.appendChild(el);

    let imgEl: HTMLImageElement = el.querySelector<HTMLImageElement>("img")!;
    imgEl.loading = "eager";
    imgEl.style.opacity = "1";

    let xhr: XMLHttpRequest | null = null, sendXhrTimeout: NodeJS.Timeout;

    const imgName = el.getAttribute("data-img-name")!;
    const compressedImageSrc = el.getAttribute("data-compressed-img-src")!;
    const largeImageSrc = el.getAttribute("data-large-img-src")!;
    
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.has("view"))
      window.history.pushState(
        { fullscreen: true, imgName, compressedImageSrc, largeImageSrc }, 
        document.title, 
        `?view=${imgName}`
      );

    progressEl.style.transition = "none";
    window.requestAnimationFrame(() => {
      progressEl.style.opacity = "1";
      progressEl.style.width = "0";

      window.requestAnimationFrame(() => {
        progressEl.style.transition = "200ms ease";

        sendXhrTimeout = setTimeout(() => {
          xhr = loadImage(largeImageSrc, (progress) => {
            progressEl.style.width = (window.innerWidth + 6) * progress + "px";
          }, (src) => {
            imgEl.src = src;
    
            setTimeout(() => {
              progressEl.style.opacity = "0";
            }, 300);
          });
        }, 205);
      });
    });

    function displayOldEl(show: boolean) {
      let oldEl = document.querySelector<HTMLDivElement>(
        `[data-compressed-img-src="${el.getAttribute("data-compressed-img-src")}"]`
      )!;
      oldEl.style.opacity = show ? "1" : "0";
    }

    function handleResize(cover = false) {
      let padding: number;
      if (cover) padding = 0;
      else padding = Math.min(20, window.innerWidth * 0.025);

      let width: number, height: number;

      if (cover != (
        imgEl.naturalWidth / imgEl.naturalHeight <
        (window.innerWidth - padding) / (window.innerHeight - padding)
      )) {
        // tall images
        height = window.innerHeight - 2 * padding;
        width = height * imgEl.naturalWidth / imgEl.naturalHeight;
      }
      else {
        // wide images
        width = window.innerWidth - 2 * padding;
        height = width * imgEl.naturalHeight / imgEl.naturalWidth;
      }

      el.style.left = (window.innerWidth - width) * .5 + "px";
      el.style.top = (window.innerHeight - height) * .5 + "px";
      el.style.width = width + "px";
      el.style.height = height + "px";

      window.requestAnimationFrame(() => displayOldEl(false));

      return [width, height];
    }
    const handleResizeWithEmtpyArguments = () => handleResize();

    window.requestAnimationFrame(() => {
      document.body.style.overflowY = "hidden";
      el.style.transition = "none";

      window.requestAnimationFrame(() => {
        el.style.position = "absolute";

        el.style.left = oldEl.offsetLeft + "px";
        el.style.top = oldEl.offsetTop - window.scrollY + "px";
        el.style.width = oldEl.clientWidth + "px";
        el.style.height = oldEl.clientHeight + "px";

        el.style.backgroundColor = "transparent";
        el.style.display = "flex";
        el.style.justifyContent = "center";
        el.style.alignItems = "center";

        window.requestAnimationFrame(() => {
          backdropEl.classList.add("show");
          displayOldEl(false);

          el.style.transition = "200ms ease";

          handleResize();          
          window.requestAnimationFrame(() => {
            window.addEventListener("resize", handleResizeWithEmtpyArguments);
          });
        });
      });
    });

    let mouse = {
      dragging: false,
      scale: 1,
      x: 0,
      y: 0,
      px: 0,
      py: 0,
      setMouseStats(ev: MouseEvent) {
        mouse.x = ev.clientX - window.innerWidth * .5;
        mouse.y = ev.clientY - window.innerHeight * .5;
        mouse.px = mouse.x / window.innerWidth;
        mouse.py = mouse.y / window.innerHeight;
      },
      handleDrag() {
        if (mouse.dragging) {
          el.style.cursor = "none";
          document.body.style.cursor = "none";

          let [width, height] = handleResize(true);

          imgEl.style.transform = `translate(${-mouse.px * (width * mouse.scale - window.innerWidth)
            }px, ${-mouse.py * (height * mouse.scale - window.innerHeight)
            }px) scale(${mouse.scale
            })`;
        }
        else {
          handleResize();
          el.style.cursor = "";
          document.body.style.cursor = "";
          imgEl.style.transform = "none";
        }
      },
      closeDrag() {
        // delay so won"t accidentally close the image
        window.requestAnimationFrame(() => {
          mouse.scale = 1;
          mouse.dragging = false;
          mouse.handleDrag();
        });
      },
      listeners: {
        down(ev: MouseEvent) {
          if (ev.button !== 0) return;

          mouse.dragging = true;
          mouse.setMouseStats(ev);
          mouse.handleDrag();
        },
        up() {
          mouse.closeDrag();
        },
        move(ev: MouseEvent) {
          mouse.setMouseStats(ev);
          mouse.handleDrag();
        },
        wheel(ev: WheelEvent) {
          if (!mouse.dragging) return;
          
          mouse.scale *= ev.deltaY > 0 ? 0.8 : 1.25;
          if (mouse.scale < 1) mouse.scale = 1;
          mouse.handleDrag();
        }
      }
    };

    imgEl.addEventListener("mousedown", mouse.listeners.down);
    fullscreenContainer.addEventListener("mouseup", mouse.listeners.up);
    fullscreenContainer.addEventListener("mousemove", mouse.listeners.move);
    fullscreenContainer.addEventListener("wheel", mouse.listeners.wheel);

    function handlePopstate(ev: PopStateEvent) {
      if (!ev.state || !ev.state.fullscreen)
        closeLargeImage();
    }
    window.addEventListener("popstate", handlePopstate);

    function handleClick(ev: MouseEvent) {
      if (mouse.dragging) return;

      window.history.back();
    }
    fullscreenContainer.addEventListener("click", handleClick);

    function closeLargeImage() {
      imgEl.removeEventListener("mousedown", mouse.listeners.down);
      fullscreenContainer.removeEventListener("mouseup", mouse.listeners.up);
      fullscreenContainer.removeEventListener("mousemove", mouse.listeners.move);
      fullscreenContainer.removeEventListener("wheel", mouse.listeners.wheel);

      fullscreenContainer.removeEventListener("click", handleClick);
      window.removeEventListener("popstate", handlePopstate);

      window.requestAnimationFrame(() => {
        backdropEl.classList.remove("show");
        fullscreenContainer.style.pointerEvents = "none";

        let oldEl = document.querySelector<HTMLDivElement>(
          `[data-compressed-img-src="${el.getAttribute("data-compressed-img-src")}"]`
        )!;
        el.style.left = oldEl.offsetLeft + "px";
        el.style.top = oldEl.offsetTop - window.scrollY + "px";
        el.style.width = oldEl.clientWidth + "px";
        el.style.height = oldEl.clientHeight + "px";

        imgEl.src = el.getAttribute("data-compressed-img-src")!;

        clearTimeout(sendXhrTimeout);
        if (xhr) xhr.abort();
        xhr = null;
        progressEl.style.opacity = "0";

        window.removeEventListener("resize", handleResizeWithEmtpyArguments);
      });

      setTimeout(() => {
        window.requestAnimationFrame(() => {
          el.remove();
          displayOldEl(true);
          document.body.style.overflowY = "scroll";
        });
      }, 205);
    }
  }

  const lines = new Array<LineData>();
  let currentLine = new Array<ImageInfo>();
  let aspectRatioSum = 0;
  for (let i = 0; true; ++i) {
    if (i >= data.length) {
      lines.push({
        aspectRatio: aspectRatioSum,
        content: currentLine
      });
      break;
    }

    let aspectRatio = data[i].info.width / data[i].info.height;
    if (config.filter === "tall" && aspectRatio > 0.9) continue;
    if (config.filter === "wide" && aspectRatio < 1.1111) continue;
    if (config.filter === "square" && (aspectRatio < 0.9 || aspectRatio > 1.1111)) continue;

    aspectRatioSum += aspectRatio;
    currentLine.push(data[i]);

    if (320 * aspectRatioSum + (currentLine.length - 1) * 10 > containerWidth 
      || currentLine.length >= 6 
      || (config.align === "auto" && window.innerWidth < 480) 
      || config.align === "full") {
      lines.push({
        aspectRatio: aspectRatioSum,
        content: currentLine
      });
      currentLine = [];
      aspectRatioSum = 0;
    }
  }

  if (!lines.at(-1)?.content.length)
    lines.pop();

  container.innerHTML = "";

  for (let line of lines) {
    let height = (containerWidth - (line.content.length - 1) * 10) / line.aspectRatio;
    let lineEl = document.createElement("div");
    lineEl.classList.add("line");
    // lineEl.style.height = height + "px";
    for (let img of line.content) {
      let imgContainerEl = document.createElement("div");
      imgContainerEl.classList.add("image-container");
      imgContainerEl.addEventListener("click", showFullscreenImage);
      imgContainerEl.style.backgroundColor = img.color;
      imgContainerEl.setAttribute("data-img-name", img.path);
      imgContainerEl.setAttribute("data-large-img-src", `/illustrations/images/${img.path}`);
      imgContainerEl.setAttribute("data-compressed-img-src", `/illustrations/images_compressed/${img.path}`);
      if (line.content.length >= 4)
        imgContainerEl.style.width = height * img.info.width / img.info.height + "px";
      imgContainerEl.style.height = height + "px";

      let imgEl = document.createElement("img");
      imgEl.loading = "lazy";
      imgEl.setAttribute("src", `/illustrations/images_compressed/${img.path}`);
      imgEl.setAttribute("alt", img.path);
      imgEl.setAttribute("title", `${img.path} - ${img.info.width} × ${img.info.height} (${(img.info.size / 1000).toFixed(2)} KB)`);

      function checkIfInView() {
        const {
          top,
          bottom
        } = imgEl.getBoundingClientRect();

        if ((
          (top > 0 && top < window.innerHeight) ||
          (bottom > 0 && bottom < window.innerHeight) ||
          (top < 0 && bottom > window.innerHeight)
        ) && imgEl.complete) imgEl.style.opacity = "1";
        else imgEl.style.opacity = "0";
      }
      checkIfInView();
      imgEl.addEventListener("load", checkIfInView);
      window.addEventListener("scroll", checkIfInView);

      imgContainerEl.appendChild(imgEl);
      lineEl.appendChild(imgContainerEl);
    }
    container.appendChild(lineEl);
  }
}

function checkParams() {
  const urlParams = new URLSearchParams(window.location.search);
  if (!urlParams.has("view")) return;

  let imgName = urlParams.get("view");

  const el = document.querySelector(`[data-img-name='${imgName}']`)!;
  if (!el) return;

  const imgEl = el.querySelector("img")!;

  imgEl.src = imgEl.src;
  imgEl.loading = "eager";

  function onTargetImageLoad() {
    imgEl.removeEventListener("load", onTargetImageLoad);

    el.dispatchEvent(new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
      button: 0
    }));
  }
  imgEl.addEventListener("load", onTargetImageLoad);
}
checkParams();
window.addEventListener("popstate", () => checkParams());

document.querySelector<HTMLSpanElement>(".open-options")!.addEventListener("click", () => {
 document.querySelector(".options")!.classList.toggle("show");
});
document.querySelectorAll<SVGSVGElement>(".header-icon").forEach((svgEl) => {
  svgEl.addEventListener("click", (ev) => {
    svgEl.style.animationName = "";
    window.requestAnimationFrame(() => {
      svgEl.style.animationName = "spin";
    });
  });
});
document.querySelector<HTMLInputElement>("#apply-options")!.addEventListener("click", () => {
  config.sort = document.querySelector<HTMLSelectElement>(".options #sort")!.value;
  config.slightlyRandom = document.querySelector<HTMLInputElement>(".options #slightly-random")!.checked;
  config.align = document.querySelector<HTMLSelectElement>(".options #align")!.value;
  config.filter = document.querySelector<HTMLSelectElement>(".options #filter-aspect-ratio")!.value;

  sort();
  restart();
});
document.querySelector("#sort")!.addEventListener("change", (ev) => {
  let checkboxContainer = document.querySelector(".slightly-random-container");

  if ((ev.target as HTMLSelectElement).value === "random")
    checkboxContainer?.classList.remove("show");
  else
    checkboxContainer?.classList.add("show");
});

let admin = false;

async function checkAdmin() {
  let text = await fetch("/illustrations/admin/").then(r => r.text());

  let adminIndicator = document.querySelector<HTMLSpanElement>(".admin-indicator")!;
  let loginButton = document.querySelector<HTMLSpanElement>(".login-button")!;

  if (text === "yes") {
    admin = true;
    adminIndicator.style.display = "";
    loginButton.style.display = "none";
  }
  else {
    admin = false;
    adminIndicator.style.display = "none";
    loginButton.style.display = "";
  }
}
checkAdmin();

document.querySelector(".login-button")?.addEventListener("click", async () => {
  let password = window.prompt("Enter Admin Password");
  if (!password) return;

  let res = await fetch("/illustrations/login/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      password
    })
  });

  if (!res.ok) {
    window.alert("Got rejected :(");
  }

  checkAdmin();
});

async function upload(files: FileList | File[] | DataTransferItemList | DataTransferItem[]) {
  let successCount = 0, failedCount = 0;
  let promises: Promise<void>[] = [];

  for (let file of files) {
    if (file.type !== "image/png" && file.type !== "image/jpeg") {
      // failedCount++;
      continue;
    }

    if (file instanceof DataTransferItem) 
      file = file.getAsFile()!;

    const reader = new FileReader();
    reader.readAsArrayBuffer(file);

    promises.push(new Promise((resolve) => {
      reader.addEventListener("load", async () => {
        const formData = new FormData();
        formData.append("file", file);
  
        let res = await fetch("/illustrations/upload/", {
          method: "POST",
          body: formData
        });
  
        if (res.ok) successCount++;
        else failedCount++;

        resolve();
      });
    }));
  }

  for (let p of promises) await p;

  return [ successCount, failedCount ];
}

const dropZone = document.querySelector<HTMLDivElement>(".drop-zone")!;

// Show drop zone when dragging a file
window.addEventListener("dragenter", (ev) => {
  if (!admin) return;

  ev.preventDefault();
  dropZone.style.display = "flex";
});

// Hide drop zone when leaving
window.addEventListener("dragleave", (ev) => {
  if (!admin) return;

  if (ev.target === dropZone || ev.relatedTarget === null) {
    dropZone.style.display = "none";
  }
});

// Prevent default behavior for dragover
window.addEventListener("dragover", (ev) => {
  if (!admin) return;

  ev.preventDefault();
});

// Handle file drop
window.addEventListener("drop", async (ev) => {
  if (!admin) return;

  ev.preventDefault();
  dropZone.style.display = "none";

  const files = ev.dataTransfer?.files;
  if (!files || !files.length) return;

  const [ successCount, failedCount ] = await upload(files);

  if (successCount || failedCount)
    window.alert(`${successCount} uploaded & ${failedCount} failed`);
});

window.addEventListener("paste", async (ev) => {
  const clipboardData = ev.clipboardData;
  if (!clipboardData) return;

  const items = clipboardData.items;
  
  const [ successCount, failedCount ] = await upload(items);

  if (successCount || failedCount)
    window.alert(`${successCount} uploaded & ${failedCount} failed`);
});

// TODO ^ Add custom UI ^
