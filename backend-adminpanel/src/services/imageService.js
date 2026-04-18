const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Image Service for handling product imagery optimization.
 */
const imageService = {
  /**
   * Processes a single image file into three WebP versions:
   * 1. Main: 1000x1000 (square crop as requested)
   * 2. Thumbnail: 300x300 (square crop)
   * 3. Mini Thumbnail: 150x150 (square crop)
   */
  processProductImage: async (file) => {
    const filename = path.parse(file.filename).name; // get filename without extension
    const uploadDir = file.destination;
    
    const versions = [
      { 
        name: 'main', 
        suffix: '_main', 
        width: 1000, 
        height: 1000, 
        fit: 'cover', // square crop to fit 1000x1000
        quality: 80 
      },
      { 
        name: 'thumb', 
        suffix: '_thumb', 
        width: 300, 
        height: 300, 
        fit: 'cover', // center crop
        quality: 75 
      },
      { 
        name: 'mini', 
        suffix: '_mini', 
        width: 150, 
        height: 150, 
        fit: 'cover', // center crop
        quality: 70 
      }
    ];

    const results = {};

    for (const v of versions) {
      const outputFilename = `${filename}${v.suffix}.webp`;
      const outputPath = path.join(uploadDir, outputFilename);

      const info = await sharp(file.path)
        .resize({
          width: v.width,
          height: v.height,
          fit: v.fit,
          background: { r: 255, g: 255, b: 255, alpha: 1 } // handle transparency
        })
        .webp({ quality: v.quality })
        .toFile(outputPath);

      results[`${v.name}_url`] = `/uploads/${outputFilename}`;
      
      // Store metadata for the main image
      if (v.name === 'main') {
        results.width = info.width;
        results.height = info.height;
        results.file_size = info.size;
        results.format = info.format;
      }
    }

    // Optional: Delete the original uploaded file to save space
    // Since we only want optimized WebP files.
    try {
      await fs.unlink(file.path);
    } catch (err) {
      console.warn(`Failed to delete original file: ${file.path}`, err);
    }

    return results;
  }
};

module.exports = imageService;
