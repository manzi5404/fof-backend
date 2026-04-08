const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");

const router = express.Router();

// temporary storage
const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No image file provided. Ensure field name is 'image'." });
        }

        const result = await cloudinary.uploader.upload(req.file.path, {
            folder: "fof_store",
        });

        // Clean up temporary file
        fs.unlink(req.file.path, (err) => {
            if (err) console.error("Failed to delete temp file:", err);
        });

        res.json({
            success: true,
            imageUrl: result.secure_url,
            public_id: result.public_id
        });
    } catch (error) {
        console.error("Cloudinary upload error:", error);

        // Clean up temporary file even on failure
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error("Failed to delete temp file after error:", err);
            });
        }

        res.status(500).json({
            success: false,
            message: "Upload failed",
            error: error.message
        });
    }
});

module.exports = router;