const db = require('./src/config/database');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

async function getHash(filePath) {
    try {
        const fileBuffer = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (err) {
        return null;
    }
}

async function runMigration() {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        console.log('Fetching existing images...');
        const [vImages] = await connection.query('SELECT * FROM variant_images');
        const [pImages] = await connection.query('SELECT * FROM product_images');

        const allImages = [...vImages, ...pImages];
        const mediaMap = new Map(); // URL -> media_id

        console.log(`Processing ${allImages.length} images...`);

        for (const img of allImages) {
            const url = img.image_url;
            if (mediaMap.has(url)) continue;

            // Attempt to get hash from file
            const relativePath = url.replace(/^\/uploads\//, '');
            const filePath = path.join(__dirname, 'uploads', relativePath);
            const hash = await getHash(filePath) || crypto.createHash('sha256').update(url).digest('hex'); // Fallback to URL hash if file missing

            // Check if hash already exists in media table
            const [existingMedia] = await connection.query('SELECT media_id FROM media WHERE hash = ?', [hash]);
            
            let mediaId;
            if (existingMedia.length > 0) {
                mediaId = existingMedia[0].media_id;
            } else {
                mediaId = uuidv4();
                await connection.query(`
                    INSERT INTO media (media_id, url, hash, thumbnail_url, mini_thumbnail_url, width, height, file_size, format)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    mediaId, url, hash, 
                    img.thumbnail_url || null, 
                    img.mini_thumbnail_url || null,
                    img.width || null,
                    img.height || null,
                    img.file_size || null,
                    img.format || null
                ]);
            }
            mediaMap.set(url, mediaId);
        }

        console.log('Migrating product mappings...');
        for (const img of pImages) {
            const mediaId = mediaMap.get(img.image_url);
            await connection.query(`
                INSERT IGNORE INTO product_media (product_id, media_id, is_primary, sort_order)
                VALUES (?, ?, ?, ?)
            `, [img.product_id, mediaId, img.is_primary || 0, 0]);
        }

        console.log('Migrating variant mappings...');
        for (const img of vImages) {
            const mediaId = mediaMap.get(img.image_url);
            await connection.query(`
                INSERT IGNORE INTO variant_media (variant_id, media_id, is_primary, sort_order)
                VALUES (?, ?, ?, ?)
            `, [img.variant_id, mediaId, img.is_primary || 0, 0]);
        }

        await connection.commit();
        console.log('✅ Data migration completed.');
        process.exit(0);
    } catch (err) {
        await connection.rollback();
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        connection.release();
    }
}

runMigration();
