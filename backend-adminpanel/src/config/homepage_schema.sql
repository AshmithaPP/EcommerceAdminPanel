-- Homepage Schema Migration

-- Home Hero Table
CREATE TABLE IF NOT EXISTS home_hero (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    image_url TEXT NOT NULL,
    cta_text VARCHAR(100),
    redirect_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Home Sections Table
CREATE TABLE IF NOT EXISTS home_sections (
    section_id CHAR(36) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- e.g., best_selling, new_arrivals, bridal, etc.
    is_active BOOLEAN DEFAULT TRUE,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Home Section Products Table
CREATE TABLE IF NOT EXISTS home_section_products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    section_id CHAR(36) NOT NULL,
    product_id CHAR(36) NOT NULL,
    display_order INT DEFAULT 0,
    FOREIGN KEY (section_id) REFERENCES home_sections(section_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Testimonials Table
CREATE TABLE IF NOT EXISTS testimonials (
    testimonial_id CHAR(36) PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    designation VARCHAR(100),
    rating DECIMAL(2,1) DEFAULT 5.0,
    comment TEXT NOT NULL,
    image_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Update categories table
ALTER TABLE categories ADD COLUMN slug VARCHAR(255);
ALTER TABLE categories ADD COLUMN image_url TEXT;
ALTER TABLE categories ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;

-- Update products table
ALTER TABLE products ADD COLUMN rating DECIMAL(2,1) DEFAULT 0.0;
ALTER TABLE products ADD COLUMN reviews_count INT DEFAULT 0;
ALTER TABLE products ADD COLUMN discount_percentage INT DEFAULT 0;
ALTER TABLE products ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE products ADD COLUMN stock_status VARCHAR(50) DEFAULT 'in_stock';

-- Update blogs table
ALTER TABLE blogs ADD COLUMN slug VARCHAR(255) UNIQUE;
ALTER TABLE blogs ADD COLUMN excerpt TEXT;
ALTER TABLE blogs ADD COLUMN is_published BOOLEAN DEFAULT FALSE;
