

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// 1. Configure your Cloudinary credentials from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key:    process.env.API_KEY,
  api_secret: process.env.API_SECRET,
});

// 2. Multer storage engine for direct uploads to Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    // You can customize folder by fieldname, mimetype, etc.
    let folder = "uploads";
    if (file.fieldname === "thumbnail")    folder = "products/thumbnails";
    else if (file.fieldname === "images")   folder = "products/images";
    else if (file.fieldname === "slider")   folder = "slider";
    else if (file.fieldname === "category") folder = "categories";

    return {
      folder,
      allowed_formats: ["jpg", "jpeg", "png"],
      public_id: (req, file) => {
        // keep original name but strip extension
        const name = file.originalname.replace(/\.[^/.]+$/, "");
        return `${folder}/${name}-${Date.now()}`;
      },
    };
  },
});

// 3. Utility to extract Cloudinary public_id from a secured URL
function getPublicIdFromUrl(url) {
  // Example URL:
  // https://res.cloudinary.com/<cloud_name>/image/upload/v1234567890/folderName/fileName.jpg
  const parts = url.split("/");
  const versionAndPath = parts.slice(parts.indexOf("upload") + 1);
  // remove the "v1234567890" part
  const [, ...pathParts] = versionAndPath;
  // join back folderName/fileName (with no extension)
  const fileWithExt = pathParts.join("/");
  return fileWithExt.replace(/\.[^/.]+$/, "");
}

module.exports = {
  cloudinary,
  storage,
  getPublicIdFromUrl,
};
