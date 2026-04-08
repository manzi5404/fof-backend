-- fix_reservations.sql
-- Run this script to fix the reservations table schema

USE faith_over_fear;

-- 1. Add user_id column if it doesn't exist
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'faith_over_fear'
    AND TABLE_NAME = 'reservations'
    AND COLUMN_NAME = 'user_id');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE reservations ADD COLUMN user_id INT DEFAULT NULL AFTER id',
    'SELECT "user_id column already exists"');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Update status ENUM to include delivered and returned
ALTER TABLE reservations
MODIFY COLUMN status ENUM('pending', 'contacted', 'delivered', 'returned', 'cancelled') DEFAULT 'pending';

-- 3. Verify the table structure
DESCRIBE reservations;