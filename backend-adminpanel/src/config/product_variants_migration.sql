SET FOREIGN_KEY_CHECKS = 0;

-- Drop legacy tables if they exist
DROP TABLE IF EXISTS product_attribute_values;
DROP TABLE IF EXISTS product_images;

-- Products table
DROP TABLE IF EXISTS variant_images;
DROP TABLE IF EXISTS variant_attributes;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;

CREATE TABLE products (
    product_id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category_id CHAR(36) NOT NULL,
    brand VARCHAR(100),
    base_price DECIMAL(10,2),
    status TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    INDEX idx_category (category_id)
);

-- Product variants table
CREATE TABLE product_variants (
    variant_id CHAR(36) PRIMARY KEY,
    product_id CHAR(36) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    price DECIMAL(10,2) NOT NULL,
    status TINYINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    INDEX idx_product (product_id),
    INDEX idx_sku (sku)
);

-- Variant attributes (links to existing attribute system)
CREATE TABLE variant_attributes (
    variant_attribute_id CHAR(36) PRIMARY KEY,
    variant_id CHAR(36) NOT NULL,
    attribute_id CHAR(36) NOT NULL,
    attribute_value_id CHAR(36) NOT NULL,
    FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE CASCADE,
    FOREIGN KEY (attribute_id) REFERENCES attributes(attribute_id),
    FOREIGN KEY (attribute_value_id) REFERENCES attribute_values(attribute_value_id),
    UNIQUE KEY unq_variant_attribute (variant_id, attribute_id)
);

-- Variant images
CREATE TABLE variant_images (
    image_id CHAR(36) PRIMARY KEY,
    variant_id CHAR(36) NOT NULL,
    image_url TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE CASCADE
);

SET FOREIGN_KEY_CHECKS = 1;