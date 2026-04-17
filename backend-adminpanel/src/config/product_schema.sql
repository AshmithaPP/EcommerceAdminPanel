-- Products Table
CREATE TABLE IF NOT EXISTS products (
    product_id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category_id CHAR(36) NOT NULL,
    base_price DECIMAL(10, 2) DEFAULT 0.00,
    sale_price DECIMAL(10, 2) DEFAULT 0.00,
    status TINYINT DEFAULT 1 COMMENT '1: active, 0: deleted',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    INDEX idx_product_category (category_id),
    INDEX idx_product_status (status)
) ENGINE=InnoDB;

-- Product Attribute Values
-- Drop the stub if it exists or modify it
DROP TABLE IF EXISTS product_attribute_values;
CREATE TABLE product_attribute_values (
    id CHAR(36) PRIMARY KEY,
    product_id CHAR(36) NOT NULL,
    attribute_id CHAR(36) NOT NULL,
    attribute_value_id CHAR(36) NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_id) REFERENCES attributes(attribute_id) ON DELETE RESTRICT,
    FOREIGN KEY (attribute_value_id) REFERENCES attribute_values(attribute_value_id) ON DELETE RESTRICT,
    UNIQUE KEY unq_product_attribute (product_id, attribute_id),
    INDEX idx_pav_product (product_id),
    INDEX idx_pav_attribute (attribute_id)
) ENGINE=InnoDB;

-- Product Images Table
CREATE TABLE IF NOT EXISTS product_images (
    image_id CHAR(36) PRIMARY KEY,
    product_id CHAR(36) NOT NULL,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    INDEX idx_pi_product (product_id)
) ENGINE=InnoDB;
