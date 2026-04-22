-- Migration for Dynamic Variant System
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Update category_attributes and sub_category_attributes tables
-- Add is_variant_attribute flag to control default behavior at category level
ALTER TABLE category_attributes 
ADD COLUMN is_variant_attribute TINYINT(1) DEFAULT 0 AFTER attribute_id;

ALTER TABLE sub_category_attributes 
ADD COLUMN is_variant_attribute TINYINT(1) DEFAULT 0 AFTER attribute_id;

-- 2. Update products table
-- Add base_sku for auto-generation logic
-- Add variant_config for storing per-product attribute selections and generator flags
ALTER TABLE products 
ADD COLUMN base_sku VARCHAR(100) NULL AFTER slug,
ADD COLUMN variant_config JSON NULL AFTER base_sku;

SET FOREIGN_KEY_CHECKS = 1;
