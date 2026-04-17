-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
    category_id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    parent_category_id CHAR(36) NULL,
    display_order INT DEFAULT 0,
    status TINYINT DEFAULT 1 COMMENT '1: active, 0: deleted',
    created_by CHAR(36) NULL,
    updated_by CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    INDEX idx_category_parent (parent_category_id),
    INDEX idx_category_status (status)
) ENGINE=InnoDB;

-- Global Attributes Table
CREATE TABLE IF NOT EXISTS attributes (
    attribute_id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    status TINYINT DEFAULT 1 COMMENT '1: active, 0: deleted',
    created_by CHAR(36) NULL,
    updated_by CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_attribute_status (status)
) ENGINE=InnoDB;

-- Attribute Values Table
CREATE TABLE IF NOT EXISTS attribute_values (
    attribute_value_id CHAR(36) PRIMARY KEY,
    attribute_id CHAR(36) NOT NULL,
    value VARCHAR(255) NOT NULL,
    status TINYINT DEFAULT 1 COMMENT '1: active, 0: deleted',
    created_by CHAR(36) NULL,
    updated_by CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (attribute_id) REFERENCES attributes(attribute_id) ON DELETE CASCADE,
    UNIQUE KEY unq_attr_val (attribute_id, value),
    INDEX idx_attr_val_attr (attribute_id),
    INDEX idx_attr_val_status (status)
) ENGINE=InnoDB;

-- Category Attributes (Junction Table)
CREATE TABLE IF NOT EXISTS category_attributes (
    category_attribute_id CHAR(36) PRIMARY KEY,
    category_id CHAR(36) NOT NULL,
    attribute_id CHAR(36) NOT NULL,
    created_by CHAR(36) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    FOREIGN KEY (attribute_id) REFERENCES attributes(attribute_id) ON DELETE RESTRICT,
    UNIQUE KEY unq_category_attribute (category_id, attribute_id),
    INDEX idx_cat_attr_cat (category_id),
    INDEX idx_cat_attr_attr (attribute_id)
) ENGINE=InnoDB;

-- Product Attribute Values (Dependency Check Stub)
CREATE TABLE IF NOT EXISTS product_attribute_values (
    product_attribute_value_id CHAR(36) PRIMARY KEY,
    product_id CHAR(36) NOT NULL,
    attribute_value_id CHAR(36) NOT NULL,
    FOREIGN KEY (attribute_value_id) REFERENCES attribute_values(attribute_value_id) ON DELETE RESTRICT,
    INDEX idx_prod_attr_val (attribute_value_id)
) ENGINE=InnoDB;
