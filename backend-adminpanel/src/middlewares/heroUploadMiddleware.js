const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/hero/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `hero-${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const fileFilter = (req, file, cb) => {
    // Block PNG, allow only WebP and JPEG
    const allowedTypes = ['image/jpeg', 'image/webp', 'image/jpg'];
    
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        const error = new Error('Invalid format. Only WebP (preferred) and JPEG are allowed for hero banners. PNG is blocked.');
        error.code = 'INVALID_FILE_TYPE';
        cb(error, false);
    }
};

const heroUpload = multer({
    storage: storage,
    limits: {
        fileSize: 200 * 1024 // Strict 200 KB limit
    },
    fileFilter: fileFilter
});

module.exports = heroUpload;
