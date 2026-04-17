-- Extend Users table to support 'user' role and additional customer data
-- Note: Using standard ALTER. If it fails due to existing column, the migration script handles it.
ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'superadmin', 'user') DEFAULT 'user';

-- Try to add phone and status. If they already exist, MySQL will throw an error and initDb.js will log it and continue.
ALTER TABLE users ADD COLUMN phone VARCHAR(20) UNIQUE AFTER email;
ALTER TABLE users ADD COLUMN status TINYINT DEFAULT 1 COMMENT '1: active, 0: blocked' AFTER role;

-- Create Customer Addresses Table
CREATE TABLE IF NOT EXISTS customer_addresses (
    address_id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    zip_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_address_user (user_id)
) ENGINE=InnoDB;
