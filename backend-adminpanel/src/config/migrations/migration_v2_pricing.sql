-- Migration: Add Pricing and GST columns
-- Date: 2026-04-18

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Add gstPercent to products table
ALTER TABLE products 
ADD COLUMN gstPercent DECIMAL(5, 2) DEFAULT 0.00 AFTER brand;

-- 2. Add mrp and sellingPrice to product_variants table
ALTER TABLE product_variants
ADD COLUMN mrp DECIMAL(10, 2) DEFAULT 0.00 AFTER sku,
ADD COLUMN sellingPrice DECIMAL(10, 2) DEFAULT 0.00 AFTER mrp;

-- 3. (Optional) Initialize sellingPrice with existing price for backward compatibility
UPDATE product_variants SET sellingPrice = price WHERE sellingPrice = 0;

SET FOREIGN_KEY_CHECKS = 1;
