-- Settings table for dynamic configuration
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    settings_key VARCHAR(100) NOT NULL UNIQUE,
    value JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed initial default settings if they don't exist
-- 1. Store Settings
INSERT IGNORE INTO settings (settings_key, value) VALUES (
    'store_settings', 
    '{"gst": 5, "default_stock": 10}'
);

-- 2. General Site Info (DataTable settings)
INSERT IGNORE INTO settings (settings_key, value) VALUES (
    'site_info', 
    '[{"id": 1, "name": "Site URL", "key": "site_url", "value": "https://silkcurator.com", "type": "url"}, {"id": 2, "name": "Website Title", "key": "site_title", "value": "Silk Curator - Handcrafted Sarees", "type": "text"}, {"id": 3, "name": "Website Logo", "key": "site_logo", "value": "https://silkcurator.com/logo.png", "type": "image"}, {"id": 4, "name": "Contact Email", "key": "email_id", "value": "support@silkcurator.com", "type": "email"}, {"id": 5, "name": "Phone Number", "key": "phone_number", "value": "+91 98765 43210", "type": "phone"}, {"id": 6, "name": "Office Address", "key": "address", "value": "123, Silk Bazaar, Kanchipuram, Tamil Nadu - 631501", "type": "textarea"}]'
);

-- 2. Homepage Hero Settings
INSERT IGNORE INTO settings (settings_key, value) VALUES (
    'hero_settings', 
    '{"image": "", "title": "New Collection", "subtitle": "Discover our latest silk sarees", "buttonText": "Shop Now", "buttonLink": "/products"}'
);

-- 3. Seasonal Banner Settings
INSERT IGNORE INTO settings (settings_key, value) VALUES (
    'banner_settings', 
    '{"enabled": false, "title": "Seasonal Sale", "description": "Special discounts for this festive season", "image": "", "startDate": "", "endDate": ""}'
);
