require('dotenv').config();
const { sendLowStockEmail } = require('./src/utils/emailService');

const mockProduct = {
    product_name: "Test Kanchipuram Silk Saree",
    variant_name: "Golden Red Classic",
    variant_sku: "KNC-RED-GLD-001",
    quantity: 3,
    low_stock_threshold: 5
};

console.log("🚀 Starting SMTP connection test with Brevo...");
console.log("📋 Using Configurations:", {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    targetAdmin: process.env.ADMIN_EMAIL
});

sendLowStockEmail(mockProduct)
    .then(success => {
        if (success) {
            console.log("\n🎉 SUCCESS! Test email sent successfully.");
            console.log("👉 Please check your inbox (and your spam folder just in case) for: ashmitha048@gmail.com\n");
        } else {
            console.log("\n❌ FAILED. The email service rejected the connection or failed to deliver.");
        }
        process.exit(0);
    })
    .catch(err => {
        console.error("💥 CRITICAL FAILURE running test script:", err);
        process.exit(1);
    });
