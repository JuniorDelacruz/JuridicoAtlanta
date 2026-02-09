// backend/src/utils/upload.js
import multer from "multer";
import path from "path";
import fs from "fs";

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function makeSafeFilename(originalName) {
  // mantém extensão e gera nome único
  const ext = path.extname(originalName || "").toLowerCase();
  const stamp = Date.now() + "-" + Math.round(Math.random() * 1e9);
  return `${stamp}${ext}`;
}

export function createImageUpload({
  dest = "public/uploads",
  maxSizeMB = 5,
} = {}) {
  ensureDir(dest);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, dest),
    filename: (req, file, cb) => cb(null, makeSafeFilename(file.originalname)),
  });

  const fileFilter = (req, file, cb) => {
    if (file?.mimetype?.startsWith("image/")) return cb(null, true);
    cb(new Error("Apenas imagens são permitidas"));
  };

  return multer({
    storage,
    limits: { fileSize: maxSizeMB * 1024 * 1024 },
    fileFilter,
  });
}
