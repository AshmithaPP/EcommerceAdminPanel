-- New Stock History Table
CREATE TABLE IF NOT EXISTS stock_history (
    id CHAR(36) PRIMARY KEY,
    variant_id CHAR(36) NOT NULL,
    action ENUM('ORDER_CREATED', 'ORDER_CANCELLED', 'ADMIN_PURCHASE', 'ADMIN_SET') NOT NULL,
    quantity INT NOT NULL COMMENT 'Change amount',
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reference_id VARCHAR(100) DEFAULT NULL COMMENT 'order_id for order-related actions',
    reason TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (variant_id) REFERENCES product_variants(variant_id) ON DELETE CASCADE,
    INDEX idx_history_variant (variant_id),
    INDEX idx_history_action (action),
    INDEX idx_history_reference (reference_id),
    INDEX idx_history_created (created_at)
) ENGINE=InnoDB;

-- Ensure inventory_levels is focused on quantity
-- Note: available_quantity and reserved_quantity are maintained but logic shifts to immediate deduction.
