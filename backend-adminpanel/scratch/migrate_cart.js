const db = require('../src/config/database');
async function migrate(){
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS carts (
        cart_id CHAR(36) PRIMARY KEY,
        user_id CHAR(36) NULL,
        guest_id CHAR(36) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_guest_id (guest_id)
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        cart_item_id CHAR(36) PRIMARY KEY,
        cart_id CHAR(36) NOT NULL,
        product_id CHAR(36) NOT NULL,
        variant_id CHAR(36) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        price_at_added DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (cart_id) REFERENCES carts(cart_id) ON DELETE CASCADE,
        INDEX idx_cart_id (cart_id)
      )
    `);
    console.log('✅ Cart tables created successfully');
  } catch(e) { 
    console.error('Migration failed:', e); 
  } finally { 
    process.exit(); 
  }
} 
migrate();
