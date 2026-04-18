const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // Create unique filename with original extension
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// File filter (images and videos)
const fileFilter = (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/webp', 'image/jpg'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime'];

    if (file.mimetype.startsWith('image/')) {
        if (allowedImageTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only WebP and JPEG/JPG images are allowed!'), false);
        }
    } else if (file.mimetype.startsWith('video/')) {
        if (allowedVideoTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only MP4, WebM, and MOV videos are allowed!'), false);
        }
    } else {
        cb(new Error('Invalid file type!'), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: (req, file, cb) => {
            // This is actually handled better by checking file.size in the filter or controller
            // but multer's limits.fileSize is a global threshold.
            // We'll set a high threshold here and handle specifics in the controller or a custom check.
            return 50 * 1024 * 1024; 
        }
    },
    fileFilter: fileFilter
});

module.exports = upload;
