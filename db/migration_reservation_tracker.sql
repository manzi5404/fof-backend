-- migration_reservation_tracker.sql
-- Update reservations table for status tracking and user linkage

USE faith_over_fear;

-- 1. Update status ENUM to include delivered and returned
-- Note: We also keep 'contacted' and 'cancelled'. We replace 'converted' with 'delivered'.
ALTER TABLE reservations 
MODIFY COLUMN status ENUM('pending', 'contacted', 'delivered', 'returned', 'cancelled') DEFAULT 'pending';

-- 2. Add user_id column to link reservations to accounts
-- This allows users to track their history even if they change their phone/email (if logged in).
ALTER TABLE reservations 
ADD COLUMN user_id INT DEFAULT NULL AFTER id;

-- Add foreign key constraint if users table exists and is appropriate
-- ALTER TABLE reservations ADD CONSTRAINT fk_reservation_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;
