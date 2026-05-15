const db = require('./src/config/database');

async function restoreSchema() {
    try {
        console.log('🚀 Starting Full Database Schema Restoration...');

        // 1. Users
        await db.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                phone VARCHAR(15),
                role ENUM('user', 'admin', 'superadmin') DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Users table ready');

        // 2. Categories & Sub-categories
        await db.query(`
            CREATE TABLE IF NOT EXISTS categories (
                category_id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                slug VARCHAR(100) UNIQUE,
                image_url TEXT,
                is_featured TINYINT(1) DEFAULT 0,
                display_order INT DEFAULT 0,
                status TINYINT(1) DEFAULT 1,
                created_by VARCHAR(36),
                updated_by VARCHAR(36),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Categories table ready');

        await db.query(`
            CREATE TABLE IF NOT EXISTS sub_categories (
                sub_category_id VARCHAR(36) PRIMARY KEY,
                category_id VARCHAR(36) NOT NULL,
                name VARCHAR(100) NOT NULL,
                slug VARCHAR(100) UNIQUE,
                status TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(category_id)
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Sub-categories table ready');

        // 2. Attributes
        await db.query(`
            CREATE TABLE IF NOT EXISTS attributes (
                attribute_id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                status TINYINT(1) DEFAULT 1,
                created_by VARCHAR(36),
                updated_by VARCHAR(36),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Attributes table ready');

        await db.query(`
            CREATE TABLE IF NOT EXISTS attribute_values (
                attribute_value_id VARCHAR(36) PRIMARY KEY,
                attribute_id VARCHAR(36) NOT NULL,
                value VARCHAR(100) NOT NULL,
                slug VARCHAR(100) NOT NULL,
                color_code VARCHAR(50),
                status TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (attribute_id) REFERENCES attributes(attribute_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Attribute Values table ready');

        await db.query(`
            CREATE TABLE IF NOT EXISTS category_attributes (
                category_attribute_id VARCHAR(36) PRIMARY KEY,
                category_id VARCHAR(36) NOT NULL,
                attribute_id VARCHAR(36) NOT NULL,
                is_variant_attribute TINYINT(1) DEFAULT 0,
                FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE,
                FOREIGN KEY (attribute_id) REFERENCES attributes(attribute_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Category Attributes mapping table ready');

        // 3. Products
        await db.query(`
            CREATE TABLE IF NOT EXISTS products (
                product_id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                sub_category_id VARCHAR(36),
                brand VARCHAR(100),
                video_url TEXT,
                gstPercent DECIMAL(5,2) DEFAULT 0,
                priceIncludesGST TINYINT(1) DEFAULT 1,
                base_sku VARCHAR(100),
                variant_config JSON,
                meta_title VARCHAR(255),
                meta_description TEXT,
                badge VARCHAR(50),
                tagline VARCHAR(255),
                pricing_meta JSON,
                stock_meta JSON,
                services JSON,
                trust_badges JSON,
                highlights JSON,
                care_instructions JSON,
                additional_info JSON,
                origin_info JSON,
                stats JSON,
                is_featured TINYINT(1) DEFAULT 0,
                status TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (sub_category_id) REFERENCES sub_categories(sub_category_id)
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Products table ready');

        // 4. Variants
        await db.query(`
            CREATE TABLE IF NOT EXISTS product_variants (
                variant_id VARCHAR(36) PRIMARY KEY,
                product_id VARCHAR(36) NOT NULL,
                sku VARCHAR(100) UNIQUE NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                mrp DECIMAL(10,2) DEFAULT 0,
                sellingPrice DECIMAL(10,2) DEFAULT 0,
                basePrice DECIMAL(10,2) DEFAULT 0,
                gstAmount DECIMAL(10,2) DEFAULT 0,
                finalPrice DECIMAL(10,2) DEFAULT 0,
                status TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Product Variants table ready');

        await db.query(`
            CREATE TABLE IF NOT EXISTS variant_attributes (
                variant_attribute_id VARCHAR(36) PRIMARY KEY,
                variant_id VARCHAR(36) NOT NULL,
                attribute_id VARCHAR(36) NOT NULL,
                attribute_value_id VARCHAR(36) NOT NULL,
                FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE CASCADE,
                FOREIGN KEY (attribute_id) REFERENCES attributes(attribute_id),
                FOREIGN KEY (attribute_value_id) REFERENCES attribute_values(attribute_value_id)
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Variant Attributes mapping table ready');

        // 5. Media System
        await db.query(`
            CREATE TABLE IF NOT EXISTS media (
                media_id VARCHAR(36) PRIMARY KEY,
                url TEXT NOT NULL,
                hash VARCHAR(64) UNIQUE,
                thumbnail_url TEXT,
                mini_thumbnail_url TEXT,
                width INT,
                height INT,
                file_size INT,
                format VARCHAR(10),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Media table ready');

        await db.query(`
            CREATE TABLE IF NOT EXISTS product_media (
                product_id VARCHAR(36) NOT NULL,
                media_id VARCHAR(36) NOT NULL,
                is_primary TINYINT(1) DEFAULT 0,
                sort_order INT DEFAULT 0,
                PRIMARY KEY (product_id, media_id),
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
                FOREIGN KEY (media_id) REFERENCES media(media_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Product Media mapping table ready');

        await db.query(`
            CREATE TABLE IF NOT EXISTS variant_media (
                variant_id VARCHAR(36) NOT NULL,
                media_id VARCHAR(36) NOT NULL,
                is_primary TINYINT(1) DEFAULT 0,
                sort_order INT DEFAULT 0,
                PRIMARY KEY (variant_id, media_id),
                FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE CASCADE,
                FOREIGN KEY (media_id) REFERENCES media(media_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Variant Media mapping table ready');

        await db.query(`
            CREATE TABLE IF NOT EXISTS attribute_media (
                product_id VARCHAR(36) NOT NULL,
                attribute_id VARCHAR(36) NOT NULL,
                attribute_value_id VARCHAR(36) NOT NULL,
                media_id VARCHAR(36) NOT NULL,
                PRIMARY KEY (product_id, attribute_id, attribute_value_id, media_id),
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
                FOREIGN KEY (attribute_id) REFERENCES attributes(attribute_id),
                FOREIGN KEY (attribute_value_id) REFERENCES attribute_values(attribute_value_id),
                FOREIGN KEY (media_id) REFERENCES media(media_id)
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Attribute Media mapping table ready');

        // 6. Inventory
        await db.query(`
            CREATE TABLE IF NOT EXISTS inventory_levels (
                inventory_id VARCHAR(36) PRIMARY KEY,
                variant_id VARCHAR(36) NOT NULL UNIQUE,
                quantity INT DEFAULT 0,
                low_stock_threshold INT DEFAULT 10,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Inventory Levels table ready');

        await db.query(`
            CREATE TABLE IF NOT EXISTS stock_history (
                id VARCHAR(36) PRIMARY KEY,
                variant_id VARCHAR(36) NOT NULL,
                action VARCHAR(50) NOT NULL,
                quantity INT NOT NULL,
                previous_stock INT NOT NULL,
                new_stock INT NOT NULL,
                reference_id VARCHAR(100),
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Stock History table ready');

        // 7. Addresses & Orders
        await db.query(`
            CREATE TABLE IF NOT EXISTS addresses (
                address_id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                full_name VARCHAR(100) NOT NULL,
                phone VARCHAR(15) NOT NULL,
                email VARCHAR(100),
                address_line1 TEXT NOT NULL,
                address_line2 TEXT,
                landmark VARCHAR(100),
                city VARCHAR(50) NOT NULL,
                state VARCHAR(50) NOT NULL,
                postal_code VARCHAR(10) NOT NULL,
                country VARCHAR(50) NOT NULL DEFAULT 'India',
                address_type ENUM('home', 'work', 'other') DEFAULT 'home',
                is_default BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Addresses table ready');

        await db.query(`
            CREATE TABLE IF NOT EXISTS orders (
                order_id VARCHAR(36) PRIMARY KEY,
                order_number VARCHAR(20) UNIQUE NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                address_id VARCHAR(36),
                subtotal DECIMAL(10,2) NOT NULL,
                discount DECIMAL(10,2) DEFAULT 0,
                delivery_fee DECIMAL(10,2) DEFAULT 0,
                total_amount DECIMAL(10,2) NOT NULL,
                status ENUM('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled') DEFAULT 'pending',
                payment_status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
                payment_method VARCHAR(20) DEFAULT 'razorpay',
                shipping_address JSON,
                tracking_id VARCHAR(100),
                courier_name VARCHAR(100),
                estimated_delivery_date DATE,
                cancelled_at TIMESTAMP,
                is_stock_deducted TINYINT(1) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Orders table ready');

        await db.query(`
            CREATE TABLE IF NOT EXISTS order_items (
                order_item_id VARCHAR(36) PRIMARY KEY,
                order_id VARCHAR(36) NOT NULL,
                product_id VARCHAR(36) NOT NULL,
                variant_id VARCHAR(36),
                product_name VARCHAR(255) NOT NULL,
                variant_name VARCHAR(100),
                variant_sku VARCHAR(50),
                quantity INT NOT NULL,
                price DECIMAL(10,2) NOT NULL,
                image_url TEXT,
                FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Order Items table ready');

        await db.query(`
            CREATE TABLE IF NOT EXISTS payments (
                payment_id VARCHAR(36) PRIMARY KEY,
                order_id VARCHAR(36) NOT NULL,
                gateway ENUM('razorpay', 'cod') DEFAULT 'razorpay',
                gateway_order_id VARCHAR(255),
                gateway_payment_id VARCHAR(255),
                amount DECIMAL(10, 2) NOT NULL,
                status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Payments table ready');

        await db.query(`
            CREATE TABLE IF NOT EXISTS order_timeline (
                timeline_id VARCHAR(36) PRIMARY KEY,
                order_id VARCHAR(36) NOT NULL,
                status VARCHAR(50) NOT NULL,
                message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Order Timeline table ready');

        // 8. Carts
        await db.query(`
            CREATE TABLE IF NOT EXISTS carts (
                cart_id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36),
                guest_id VARCHAR(36),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Carts table ready');

        await db.query(`
            CREATE TABLE IF NOT EXISTS cart_items (
                cart_item_id VARCHAR(36) PRIMARY KEY,
                cart_id VARCHAR(36) NOT NULL,
                product_id VARCHAR(36) NOT NULL,
                variant_id VARCHAR(36) NOT NULL,
                quantity INT NOT NULL,
                price_at_added DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (cart_id) REFERENCES carts(cart_id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
                FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Cart Items table ready');

        // 8. Home Sections & Reviews
        await db.query(`
            CREATE TABLE IF NOT EXISTS home_sections (
                section_id VARCHAR(36) PRIMARY KEY,
                title VARCHAR(100) NOT NULL,
                slug VARCHAR(100) UNIQUE NOT NULL,
                display_type ENUM('grid', 'slider') DEFAULT 'grid',
                display_order INT DEFAULT 0,
                status TINYINT(1) DEFAULT 1
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Home Sections table ready');

        await db.query(`
            CREATE TABLE IF NOT EXISTS home_section_products (
                section_id VARCHAR(36) NOT NULL,
                product_id VARCHAR(36) NOT NULL,
                display_order INT DEFAULT 0,
                PRIMARY KEY (section_id, product_id),
                FOREIGN KEY (section_id) REFERENCES home_sections(section_id) ON DELETE CASCADE,
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Home Section Products mapping table ready');

        await db.query(`
            CREATE TABLE IF NOT EXISTS product_reviews (
                review_id VARCHAR(36) PRIMARY KEY,
                product_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                rating INT NOT NULL,
                comment TEXT,
                status TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Product Reviews table ready');

        // 8. Settings & Admin
        await db.query(`
            CREATE TABLE IF NOT EXISTS settings (
                id INT AUTO_INCREMENT PRIMARY KEY,
                settings_key VARCHAR(100) UNIQUE NOT NULL,
                value JSON,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Settings table ready');

        // 10. Shipping Zones (Seeded)
        await db.query(`
            CREATE TABLE IF NOT EXISTS shipping_zones (
                zone_id INT AUTO_INCREMENT PRIMARY KEY,
                zone_name VARCHAR(100) NOT NULL,
                zone_type ENUM('state', 'pincode') DEFAULT 'state',
                zone_values JSON NOT NULL,
                base_charge DECIMAL(10,2) DEFAULT 0,
                free_threshold DECIMAL(10,2) DEFAULT NULL,
                estimated_days VARCHAR(50) DEFAULT '3-5 Days',
                is_active TINYINT(1) DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
        `);
        console.log('✅ Shipping Zones table ready');

        const [shipCount] = await db.query('SELECT COUNT(*) as count FROM shipping_zones');
        if (shipCount[0].count === 0) {
            console.log('🌱 Seeding initial shipping zones...');
            await db.query(`
                INSERT INTO shipping_zones (zone_name, zone_values, base_charge, free_threshold) 
                VALUES 
                ('Tamil Nadu', '["Tamil Nadu"]', 50.00, 2000.00),
                ('South India', '["Kerala", "Karnataka", "Andhra Pradesh", "Telangana"]', 80.00, 3000.00),
                ('Rest of India', '["Maharashtra", "Gujarat", "Delhi", "Rajasthan", "West Bengal", "Madhya Pradesh"]', 120.00, 5000.00);
            `);
            console.log('✅ Default shipping zones seeded');
        }

        console.log('✨ All tables have been successfully created/verified!');
        
    } catch (err) {
        console.error('❌ Schema Restoration Failed:', err.message);
        console.error(err);
    } finally {
        process.exit();
    }
}

restoreSchema();
