-- migration_2026_02_21.sql
-- Master alignment migration for F>F backend

USE faith_over_fear;

-- 1. Update order_items to support size
ALTER TABLE order_items ADD COLUMN size VARCHAR(10) NOT NULL AFTER quantity;

-- 2. Update drops table for multiple images and type
-- Note: We add a temporary images_json column to safely transition if needed, 
-- but here we follow the plan to drop image_url for images JSON.
ALTER TABLE drops 
  ADD COLUMN type VARCHAR(50) DEFAULT 'new-drop' AFTER name,
  ADD COLUMN stock INT DEFAULT 0 AFTER price,
  ADD COLUMN images JSON DEFAULT NULL AFTER sizes;

-- Optional: Migrate existing image_url to images array (commented out as default)
-- UPDATE drops SET images = JSON_ARRAY(image_url) WHERE image_url IS NOT NULL;
-- ALTER TABLE drops DROP COLUMN image_url;

-- 3. Create settings table
CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) UNIQUE NOT NULL,
  `value` TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed defaults
INSERT IGNORE INTO settings (`key`, `value`) VALUES 
('purchasingDisabled', 'false'),
('isRestocking', 'false');

-- 4. Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  message TEXT NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  expires_at DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
