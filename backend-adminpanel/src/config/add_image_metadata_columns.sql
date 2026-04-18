-- Add metadata columns to variant_images table
ALTER TABLE variant_images
ADD COLUMN width INT AFTER image_url,
ADD COLUMN height INT AFTER width,
ADD COLUMN file_size INT AFTER height,
ADD COLUMN format VARCHAR(10) AFTER file_size;
