const db = require('./src/config/database');

const createOrderTables = async () => {
    const ordersTable = `
        CREATE TABLE IF NOT EXISTS orders (
            order_id VARCHAR(36) PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            address_id VARCHAR(36),
            status ENUM('pending', 'paid', 'failed', 'cancelled', 'shipped', 'delivered') DEFAULT 'pending',
            subtotal DECIMAL(10, 2) NOT NULL,
            discount DECIMAL(10, 2) DEFAULT 0,
            delivery_fee DECIMAL(10, 2) DEFAULT 0,
            total_amount DECIMAL(10, 2) NOT NULL,
            payment_status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
            payment_method ENUM('razorpay', 'cod', 'upi', 'card') DEFAULT 'razorpay',
            shipping_address JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    const orderItemsTable = `
        CREATE TABLE IF NOT EXISTS order_items (
            order_item_id VARCHAR(36) PRIMARY KEY,
            order_id VARCHAR(36) NOT NULL,
            product_id VARCHAR(36) NOT NULL,
            variant_id VARCHAR(36),
            quantity INT NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    const paymentsTable = `
        CREATE TABLE IF NOT EXISTS payments (
            payment_id VARCHAR(36) PRIMARY KEY,
            order_id VARCHAR(36) NOT NULL,
            gateway ENUM('razorpay') DEFAULT 'razorpay',
            gateway_order_id VARCHAR(255),
            gateway_payment_id VARCHAR(255),
            amount DECIMAL(10, 2) NOT NULL,
            status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;

    try {
        await db.query(ordersTable);
        console.log('✅ Orders table created');
        await db.query(orderItemsTable);
        console.log('✅ Order Items table created');
        await db.query(paymentsTable);
        console.log('✅ Payments table created');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating checkout tables:', err);
        process.exit(1);
    }
};

createOrderTables();
