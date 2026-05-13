const mysql = require('mysql2/promise');

async function checkMedia() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'ashmitha@123',
        database: 'saree_ecommerce_db'
    });

    try {
        const [products] = await connection.query('SELECT product_id, name FROM products WHERE name LIKE "%silk saree%"');
        console.log('Products:', products);

        for (const p of products) {
            const [productMedia] = await connection.query('SELECT pm.*, m.url, m.thumbnail_url FROM product_media pm JOIN media m ON pm.media_id = m.media_id WHERE pm.product_id = ?', [p.product_id]);
            console.log(`Product Media for ${p.name}:`, productMedia);

            const [variantMedia] = await connection.query(`
                SELECT vm.*, m.url, m.thumbnail_url 
                FROM variant_media vm 
                JOIN media m ON vm.media_id = m.media_id 
                JOIN product_variants pv ON vm.variant_id = pv.variant_id 
                WHERE pv.product_id = ?`, [p.product_id]);
            console.log(`Variant Media for ${p.name}:`, variantMedia);
        }

        const [allMedia] = await connection.query('SELECT * FROM media LIMIT 5');
        console.log('All Media Samples:', allMedia);

    } catch (err) {
        console.error(err);
    } finally {
        await connection.end();
    }
}

checkMedia();
