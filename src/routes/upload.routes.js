const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Load Cloudinary config
require('../config/cloudinary');

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP and GIF are allowed.'));
    }
  }
});

async function uploadToCloudinary(buffer, folder = 'fof/admin') {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [{ width: 1200, crop: 'limit' }]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    ).end(buffer);
  });
}

router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    console.log('Uploading file:', req.file.originalname, 'Size:', req.file.size);
    
    const result = await uploadToCloudinary(req.file.buffer, 'fof/admin');
    
    console.log('Upload success:', result.secure_url);
    
    res.status(200).json({
      success: true,
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ success: false, error: 'Upload failed: ' + error.message });
  }
});

router.post('/multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    const uploadPromises = req.files.map(file => uploadToCloudinary(file.buffer, 'fof/admin'));
    const results = await Promise.all(uploadPromises);

    const urls = results.map(r => ({
      url: r.secure_url,
      public_id: r.public_id,
      width: r.width,
      height: r.height
    }));

    res.status(200).json({ success: true, urls });
  } catch (error) {
    console.error('Cloudinary multiple upload error:', error);
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

module.exports = router;
