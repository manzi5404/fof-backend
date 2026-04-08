-- migration_2026_02_25_products.sql
-- Update products table to support collections (drops)

USE faith_over_fear;

CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  drop_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  sizes JSON, -- Array of strings: ["S", "M", "L"]
  colors JSON, -- Array of strings: ["Black", "White"]
  image_urls JSON, -- Array of strings: ["url1", "url2"]
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (drop_id) REFERENCES drops(id) ON DELETE CASCADE
);

-- Note: In previous versions, 'drops' might have acted as single products.
-- This migration ensures a proper 1:N relationship between drops and products.
