const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../cloudinary");

const FORMATS = ["jpg", "jpeg", "png", "gif", "webp"];
const limits = { fileSize: 8 * 1024 * 1024, files: 12 };

// Public listing images (same settings as before, plus webp + a size cap)
const upload = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: { folder: "generalmarket", allowed_formats: FORMATS, transformation: [{ width: 1000, height: 1000, crop: "limit" }] },
  }),
  limits,
});

// Profile photos: square crop
const avatarUpload = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: { folder: "generalmarket/avatars", allowed_formats: FORMATS, transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face" }] },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
});

// ID-verification documents: uploaded as *authenticated* assets so they are NOT publicly reachable.
const privateUpload = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: { folder: "generalmarket_private/id", type: "authenticated", allowed_formats: FORMATS },
  }),
  limits: { fileSize: 8 * 1024 * 1024, files: 3 },
});

module.exports = { upload, avatarUpload, privateUpload };
