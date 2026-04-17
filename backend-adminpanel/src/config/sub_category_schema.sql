-- Sub Categories Table
CREATE TABLE IF NOT EXISTS sub_categories (
    sub_category_id CHAR(36) PRIMARY KEY,
    category_id CHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NULL UNIQUE,
    display_order INT DEFAULT 0,
    status TINYINT DEFAULT 1 COMMENT '1: active, 0: deleted',
    created_by CHAR(36) NULL,
    updated_by CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    INDEX idx_sub_category_parent (category_id),
    INDEX idx_sub_category_status (status)
) ENGINE=InnoDB;

-- Sub Category Attributes (Junction Table)
CREATE TABLE IF NOT EXISTS sub_category_attributes (
    sub_category_attribute_id CHAR(36) PRIMARY KEY,
    sub_category_id CHAR(36) NOT NULL,
    attribute_id CHAR(36) NOT NULL,
    created_by CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sub_category_id) REFERENCES sub_categories(sub_category_id) ON DELETE RESTRICT,
    FOREIGN KEY (attribute_id) REFERENCES attributes(attribute_id) ON DELETE RESTRICT,
    UNIQUE KEY unq_sub_category_attribute (sub_category_id, attribute_id),
    INDEX idx_sub_cat_attr_sub (sub_category_id),
    INDEX idx_sub_cat_attr_attr (attribute_id)
) ENGINE=InnoDB;

-- Add sub_category_id to products table
ALTER TABLE products ADD COLUMN sub_category_id CHAR(36) NULL AFTER category_id;
ALTER TABLE products ADD CONSTRAINT fk_product_sub_category FOREIGN KEY (sub_category_id) REFERENCES sub_categories(sub_category_id) ON DELETE RESTRICT;
ALTER TABLE products ADD INDEX idx_product_sub_category (sub_category_id);
