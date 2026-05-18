const db = require('./src/config/database');
const fs = require('fs');
const path = require('path');

async function clearInvoices() {
    try {
        console.log('🧹 Clearing old invoices to force fresh regeneration...');
        
        // 1. Truncate/Clear database invoice records
        await db.query('DELETE FROM invoices');
        console.log('✅ Invoices database table cleared successfully!');

        // 2. Clear PDF files from uploads/invoices directory
        const invoicesDir = path.join(__dirname, 'uploads', 'invoices');
        if (fs.existsSync(invoicesDir)) {
            const files = fs.readdirSync(invoicesDir);
            for (const file of files) {
                if (file.endsWith('.pdf')) {
                    fs.unlinkSync(path.join(invoicesDir, file));
                    console.log(`🗑️ Deleted cached PDF: ${file}`);
                }
            }
            console.log('✅ Invoices directory cache cleared successfully!');
        } else {
            console.log('ℹ️ Invoices directory does not exist yet.');
        }

        console.log('🚀 SUCCESS: Next invoice download will dynamically generate using the new layout!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during clearance:', err);
        process.exit(1);
    }
}

clearInvoices();
