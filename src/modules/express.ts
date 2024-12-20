import express from "express";
import cookieParser from "cookie-parser";
import multer from "multer";
import fs from "fs";
import path from "path";

const adminPassword = process.env.GALLERY_UPLOAD_PASSWORD;

const publicDir = path.join(__dirname, "../../public");

const app = express();

app.use(express.json());
app.use(cookieParser());

// Serve static files (images, CSS, JS, etc.)
app.use(express.static(publicDir));

// Set up EJS as the view engine
app.set("view engine", "ejs");

const router = express.Router();

// Route to display the gallery
router.get("/", (req, res) => {
  // Render the gallery template, passing the list of image filenames
  res.render("gallery", { 
    title: process.env.GALLERY_TITLE,
    header: process.env.GALLERY_HEADER,
    admin: req.cookies.admin === adminPassword
  });
});

router.get("/data", (req, res) => {
  res.send(JSON.parse(fs.readFileSync("./data/imagesData.json").toString()));
});

router.get("/images/*", (req, res) => {
  res.status(404).render("error", {
    code: 404,
    message: "Image not found :("
  });
});

router.get("/admin", (req, res) => {
  res.send(req.cookies.admin === adminPassword ? "yes" : "no");
});

router.post("/login", (req, res) => {
  if (!req.body.password) {
    res.status(400).send("Bro, where's your password?");
    return;
  }

  if (req.body.password === adminPassword)
    res.cookie("admin", adminPassword).send("ok");
  else 
    res.send("Wrong password!");
});

const upload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, resolve) => {
      resolve(null, "./private/images_input/");
    },
    filename: (req, file, resolve) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
      const fileExtension = file.originalname.split(".").pop(); // Get the file extension
      resolve(null, file.fieldname + "-" + uniqueSuffix + "." + fileExtension);
    }
  })
});

router.post("/upload", (req, res, next) => {
  if (req.cookies.admin !== adminPassword) {
    res.status(401).send("You're not admin!");
    return;
  }

  next();
}, upload.single("file"), (req, res) => {
  if (!req.file)
    return res.status(400).send("Huh, where is your file?");
  
  res.send("ok");
});

router.get("*", (req, res) => {
  res.redirect("/illustrations/");
});

app.use("/illustrations/", router);


export async function startServer() {
  return new Promise<void>((resolve, reject) => {
    // Start the server
    app.listen(process.env.GALLERY_SERVER_PORT, () => {
      console.log(`Server is running on http://localhost:${process.env.GALLERY_SERVER_PORT}`);
      resolve();
    });
  });
}
