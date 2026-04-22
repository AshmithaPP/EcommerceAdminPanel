const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

/**
 * Image Service for handling product imagery optimization.
 */
const imageService = {
  /**
   * Processes a single image file into three WebP versions:
   */
  processProductImage: async (file) => {
    // Disable sharp cache to prevent file locking on Windows
    sharp.cache(false);

    const filename = path.parse(file.filename).name;
    const uploadDir = file.destination;
    
    // Read original into buffer once to avoid multiple file locks/handles
    const inputBuffer = await fs.readFile(file.path);
    
    const versions = [
      { name: 'main', suffix: '_main', width: 1000, height: 1000, quality: 80 },
      { name: 'thumb', suffix: '_thumb', width: 300, height: 300, quality: 75 },
      { name: 'mini', suffix: '_mini', width: 150, height: 150, quality: 70 }
    ];

    const results = {};

    for (const v of versions) {
      const outputFilename = `${filename}${v.suffix}.webp`;
      const outputPath = path.join(uploadDir, outputFilename);

      const info = await sharp(inputBuffer)
        .resize({
          width: v.width,
          height: v.height,
          fit: 'cover',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .webp({ quality: v.quality })
        .toFile(outputPath);

      results[`${v.name}_url`] = `/uploads/${outputFilename}`;
      
      if (v.name === 'main') {
        results.width = info.width;
        results.height = info.height;
        results.file_size = info.size;
        results.format = info.format;
        // Hash the optimized main file
        const optimizedBuffer = await fs.readFile(outputPath);
        results.hash = crypto.createHash('sha256').update(optimizedBuffer).digest('hex');
      }
    }

    // Safely delete the original uploaded file
    try {
      await fs.unlink(file.path);
    } catch (err) {
      console.warn(`Failed to delete original file: ${file.path}`, err);
    }

    return results;
  }
};

module.exports = imageService;
