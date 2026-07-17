-- Add quantity field to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
