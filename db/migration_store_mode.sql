-- migration_store_mode.sql
-- Implement Global storeMode and Reservations System

USE faith_over_fear;

-- 1. Create store_config table (Singleton)
CREATE TABLE IF NOT EXISTS store_config (
    id INT PRIMARY KEY DEFAULT 1,
    store_mode ENUM('live', 'reserve') DEFAULT 'live',
    announcement_message TEXT DEFAULT NULL,
    banner_enabled TINYINT(1) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT singleton_check CHECK (id = 1)
);

-- Seed initial config if not exists
INSERT IGNORE INTO store_config (id, store_mode, announcement_message, banner_enabled) 
VALUES (1, 'live', 'Welcome to Faith Over Fear!', 0);

-- 2. Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) DEFAULT NULL,
    product_id INT NOT NULL,
    size VARCHAR(20) DEFAULT NULL,
    color VARCHAR(50) DEFAULT NULL,
    quantity INT DEFAULT 1,
    status ENUM('pending', 'contacted', 'converted', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
