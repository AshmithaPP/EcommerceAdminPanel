-- Migration: Remove base_price column from products
-- Date: 2026-04-18

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE products DROP COLUMN base_price;

SET FOREIGN_KEY_CHECKS = 1;
