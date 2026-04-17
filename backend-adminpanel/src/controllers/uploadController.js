const uploadController = {
    uploadImage: (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file uploaded'
                });
            }

            // Return the relative path of the uploaded file
            const fileUrl = `/uploads/${req.file.filename}`;
            
            res.status(200).json({
                success: true,
                message: 'Image uploaded successfully',
                data: {
                    url: fileUrl,
                    filename: req.file.filename,
                    mimetype: req.file.mimetype,
                    size: req.file.size
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error uploading image',
                error: error.message
            });
        }
    },

    uploadMultipleImages: (req, res) => {
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'No files uploaded'
                });
            }

            const filesData = req.files.map(file => ({
                url: `/uploads/${file.filename}`,
                filename: file.filename,
                mimetype: file.mimetype,
                size: file.size
            }));

            res.status(200).json({
                success: true,
                message: `${req.files.length} images uploaded successfully`,
                data: filesData
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error uploading images',
                error: error.message
            });
        }
    }
};

module.exports = uploadController;
