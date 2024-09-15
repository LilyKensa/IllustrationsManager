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

function sortByColor<T extends Object>(arr: T[], key: keyof T) {
  return arr.sort((a, b) => {
    // Convert the hex color to an integer for comparison
    const colorA = parseInt(String(a[key]).slice(1), 16);
    const colorB = parseInt(String(b[key]).slice(1), 16);

    // Sort based on the numerical value of the colors
    return colorA - colorB;
  });
}

function loadImage(imageUrl: string, onProgress: (progress: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let notifiedNotComputable = false;

    xhr.open("GET", imageUrl, true);
    xhr.responseType = "arraybuffer";

    xhr.addEventListener("progress", (ev) => {
      if (ev.lengthComputable) {
        onProgress(ev.loaded / ev.total);
      } else {
        if (!notifiedNotComputable) {
          notifiedNotComputable = true;
          onProgress(-1);
        }
      }
    });

    xhr.addEventListener("loadend", (ev) => {
      if (!xhr.status.toString().match(/^2/)) {
        reject(xhr);

        return;
      }

      const options: { type?: string } = {}
      const headers = xhr.getAllResponseHeaders();
      const m = headers.match(/^Content-Type\:\s*(.*?)$/mi);

      if (m && m[1]) {
        options.type = m[1];
      }

      resolve(window.URL.createObjectURL(
        new Blob([xhr.response], options)
      ));
    });

    xhr.send();
  });
}


//+================================================================================================+
//*============================================= main =============================================*
//+================================================================================================+

function start() {
  // Sets up three history items and places the user in the middle of those three.
  window.history.pushState({ _fileexplorer: "back" }, document.title);
  window.history.pushState({ _fileexplorer: "main" }, document.title);
  window.history.pushState({ _fileexplorer: "forward" }, document.title);
  window.history.back();

  let container = document.querySelector<HTMLDivElement>(".gallery")!;
  let containerWidth = container.getBoundingClientRect().width;

  const data = shuffle<ImageInfo>(
    JSON.parse(document.querySelector<HTMLDivElement>(".data")!.textContent!)
  );

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

    progressEl.style.transition = "none";
    window.requestAnimationFrame(() => {
      progressEl.style.opacity = "1";
      progressEl.style.width = "0";

      window.requestAnimationFrame(() => {
        progressEl.style.transition = "200ms ease";

        setTimeout(() => {
          loadImage(el.getAttribute("data-large-img-src")!, (progress) => {
            progressEl.style.width = (window.innerWidth + 6) * progress + "px";
          }).then(src => {
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
      let padding;
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

          window.requestAnimationFrame(() => {
            handleResize();
            window.addEventListener("resize", () => handleResize());
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

    function handleHistoryBackButton(ev: MouseEvent) {
      if (ev.button === 3) {
        ev.preventDefault();
        closeLargeImage();
      }
    }
    window.addEventListener("mouseup", handleHistoryBackButton);

    function handlePopState(ev: PopStateEvent) {
      if (ev.state && ev.state._fileexplorer) {
        if (ev.state._fileexplorer === "back") {
          window.history.forward();
          closeLargeImage();
        }
      }
    }
    window.addEventListener("popstate", handlePopState);

    function handleClick(ev: MouseEvent) {
      if (mouse.dragging) return;

      closeLargeImage();
    }
    fullscreenContainer.addEventListener("click", handleClick);

    function closeLargeImage() {
      imgEl.removeEventListener("mousedown", mouse.listeners.down);
      fullscreenContainer.removeEventListener("mouseup", mouse.listeners.up);
      fullscreenContainer.removeEventListener("mousemove", mouse.listeners.move);
      fullscreenContainer.removeEventListener("wheel", mouse.listeners.wheel);

      fullscreenContainer.removeEventListener("click", handleClick);
      window.removeEventListener("mouseup", handleHistoryBackButton);
      window.removeEventListener("popstate", handlePopState);

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

        window.removeEventListener("resize", () => handleResize());
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

    aspectRatioSum += data[i].info.width / data[i].info.height;
    currentLine.push(data[i]);

    if (320 * aspectRatioSum + (currentLine.length - 1) * 10 > containerWidth || currentLine.length >= 6 || window.innerWidth < 480) {
      lines.push({
        aspectRatio: aspectRatioSum,
        content: currentLine
      });
      currentLine = [];
      aspectRatioSum = 0;
    }
  }

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
          left,
          bottom,
          right
        } = imgEl.getBoundingClientRect();

        if ((
          (top > 0 && top < window.innerHeight) ||
          (bottom > 0 && bottom < window.innerHeight)
        ) && (
            (left > 0 && left < window.innerWidth) ||
            (right > 0 && right < window.innerWidth)
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

start();

window.addEventListener("resize", () => {
  start();
});
