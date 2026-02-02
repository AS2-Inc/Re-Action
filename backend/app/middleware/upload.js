import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const upload_dir = "uploads";
if (!fs.existsSync(upload_dir)) {
    fs.mkdirSync(upload_dir);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, upload_dir);
    },
    filename: function (req, file, cb) {
        const unique_suffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(
            null,
            file.fieldname + "-" + unique_suffix + path.extname(file.originalname),
        );
    },
});

const file_filter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    } else {
        cb(new Error("Not an image! Please upload an image."), false);
    }
};

export const upload = multer({
    storage: storage,
    fileFilter: file_filter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
});
