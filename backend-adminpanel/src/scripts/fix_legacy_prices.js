const db = require('../config/database');

function calculateGSTFields(sellingPrice, gstPercent, priceIncludesGST) {
    const sp = parseFloat(sellingPrice) || 0;
    const gst = parseFloat(gstPercent) || 0;
    const includesGST = priceIncludesGST === false || priceIncludesGST === 0 || priceIncludesGST === '0' || priceIncludesGST === 'false' ? false : true;

    if (includesGST) {
        const basePrice = parseFloat((sp / (1 + gst / 100)).toFixed(2));
        const gstAmount = parseFloat((sp - basePrice).toFixed(2));
        return { basePrice, gstAmount, finalPrice: sp };
    } else {
        const gstAmount = parseFloat((sp * (gst / 100)).toFixed(2));
        const finalPrice = parseFloat((sp + gstAmount).toFixed(2));
        return { basePrice: sp, gstAmount, finalPrice };
    }
}

async function fixPrices() {
    console.log('--- Starting Price Sync ---');
    try {
        const [variants] = await db.query(`
            SELECT pv.*, p.gstPercent, p.priceIncludesGST 
            FROM product_variants pv
            JOIN products p ON pv.product_id = p.product_id
            WHERE pv.finalPrice = 0 OR pv.basePrice = 0 OR pv.finalPrice IS NULL
        `);

        console.log(`Found ${variants.length} records to fix.`);

        for (const variant of variants) {
            const fields = calculateGSTFields(variant.sellingPrice, variant.gstPercent, variant.priceIncludesGST);
            
            await db.query(`
                UPDATE product_variants 
                SET basePrice = ?, gstAmount = ?, finalPrice = ? 
                WHERE variant_id = ?
            `, [fields.basePrice, fields.gstAmount, fields.finalPrice, variant.variant_id]);
            
            console.log(`Updated Variant ${variant.sku}: Selling ${variant.sellingPrice} -> Final ${fields.finalPrice}`);
        }

        console.log('--- Sync Completed Successfully ---');
        process.exit(0);
    } catch (error) {
        console.error('Error during sync:', error);
        process.exit(1);
    }
}

fixPrices();
