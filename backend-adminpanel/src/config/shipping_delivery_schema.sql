-- Shipping & Delivery Management Tables

-- 1. Shipments Table
CREATE TABLE IF NOT EXISTS shipments (
    shipment_id CHAR(36) PRIMARY KEY,
    order_id CHAR(36) NOT NULL,
    tracking_number VARCHAR(100),
    courier_name VARCHAR(100),
    status ENUM('Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'RTO') NOT NULL DEFAULT 'Packed',
    shipped_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    rto_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

-- 2. Shipment Status History (for future courier syncing and logs)
CREATE TABLE IF NOT EXISTS shipment_status_history (
    history_id CHAR(36) PRIMARY KEY,
    shipment_id CHAR(36) NOT NULL,
    status ENUM('Packed', 'Shipped', 'Out for Delivery', 'Delivered', 'RTO') NOT NULL,
    location VARCHAR(255),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id) ON DELETE CASCADE
);

-- 3. Shipping Zones Table
CREATE TABLE IF NOT EXISTS shipping_zones (
    zone_id CHAR(36) PRIMARY KEY,
    zone_name VARCHAR(100) NOT NULL,
    zone_type ENUM('state', 'pincode') NOT NULL,
    zone_values TEXT NOT NULL, -- JSON array of states or pincodes
    base_charge DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    free_threshold DECIMAL(10, 2) NULL, -- Free shipping above this amount
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
