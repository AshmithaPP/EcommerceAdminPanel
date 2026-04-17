const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Image Service for handling product imagery optimization.
 */
const imageService = {
  /**
   * Processes a single image file into three WebP versions:
   * 1. Main: 800x1000 (aspect ratio preserved or square if requested)
   * 2. Thumbnail: 300x300 (square crop)
   * 3. Mini Thumbnail: 150x150 (square crop)
   */
  processProductImage: async (file) => {
    const filename = path.parse(file.filename).name; // get filename without extension
    const uploadDir = file.destination;
    
    const versions = [
      { 
        name: 'main', 
        suffix: '', 
        width: 800, 
        height: 1000, 
        fit: 'inside', // preserve aspect ratio but fit within these bounds
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

      await sharp(file.path)
        .resize({
          width: v.width,
          height: v.height,
          fit: v.fit,
          background: { r: 255, g: 255, b: 255, alpha: 1 } // handle transparency
        })
        .webp({ quality: v.quality })
        .toFile(outputPath);

      results[`${v.name}_url`] = `/uploads/${outputFilename}`;
    }

    // Optional: Delete the original uploaded file to save space
    // Since we only want optimized WebP files.
    // await fs.unlink(file.path);

    return results;
  }
};

module.exports = imageService;
