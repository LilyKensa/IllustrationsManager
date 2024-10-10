import express from "express";
import fs from "fs";
import path from "path";

const publicDir = path.join(__dirname, "../../public");

const app = express();

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
    dataStr: fs.readFileSync("./data/imagesData.json").toString() 
  });
  // TODO ^ Storing data like this is very bad, tbh ^
});

router.get("/images/*", (req, res) => {
  res.status(404).render("error", {
    code: 404,
    message: "Image not found :("
  });
})

router.get("*", (req, res) => {
  res.redirect("/illustrations/");
})

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
