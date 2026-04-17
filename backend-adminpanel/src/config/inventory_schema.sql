-- Inventory Management Schema (Simplified)

-- Inventory Levels Table (stores current stock per variant)
-- Tracks current quantity, reserved stock, low stock threshold, etc.
CREATE TABLE IF NOT EXISTS inventory_levels (
    inventory_id CHAR(36) PRIMARY KEY,
    variant_id CHAR(36) NOT NULL UNIQUE,
    quantity INT NOT NULL DEFAULT 0 COMMENT 'Current stock quantity',
    reserved_quantity INT DEFAULT 0 COMMENT 'Quantity reserved for pending orders',
    available_quantity INT GENERATED ALWAYS AS (quantity - reserved_quantity) STORED COMMENT 'Available for purchase',
    low_stock_threshold INT DEFAULT 10 COMMENT 'Alert threshold',
    reorder_level INT DEFAULT 20 COMMENT 'Suggested reorder quantity',
    last_restocked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE CASCADE,
    INDEX idx_inventory_variant (variant_id),
    INDEX idx_inventory_available (available_quantity)
) ENGINE=InnoDB;

-- Inventory Logs Table (audit trail of every change)
-- Records delta, reason, admin ID, reference order ID, etc.
CREATE TABLE IF NOT EXISTS inventory_logs (
    log_id CHAR(36) PRIMARY KEY,
    inventory_id CHAR(36) NOT NULL,
    variant_id CHAR(36) NOT NULL,

    action VARCHAR(50) NOT NULL COMMENT 'manual_adjustment, order_placed, order_cancelled, restocking, correction',
    quantity_before INT NOT NULL,
    quantity_delta INT NOT NULL COMMENT 'Change in quantity (positive or negative)',
    quantity_after INT NOT NULL,

    reserved_before INT DEFAULT 0,
    reserved_delta INT DEFAULT 0,
    reserved_after INT DEFAULT 0,

    reason TEXT COMMENT 'Administrative reason for the change',
    reference_id VARCHAR(100) COMMENT 'order_id or other reference',
    reference_type VARCHAR(50) COMMENT 'order, adjustment, correction',

    admin_id CHAR(36) COMMENT 'Admin who made the change',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (inventory_id) REFERENCES inventory_levels(inventory_id) ON DELETE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(user_id),
    INDEX idx_log_inventory (inventory_id),
    INDEX idx_log_variant (variant_id),
    INDEX idx_log_action (action),
    INDEX idx_log_reference (reference_id, reference_type),
    INDEX idx_log_created (created_at)
) ENGINE=InnoDB;
