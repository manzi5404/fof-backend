-- migration_status_restructure.sql
USE faith_over_fear;

-- Modify drops table
ALTER TABLE drops
  ADD COLUMN status ENUM('upcoming', 'reservation', 'live') DEFAULT 'upcoming' AFTER price,
  ADD COLUMN description TEXT DEFAULT NULL AFTER title;

-- Modify orders table to transition fully to the new set of status
-- The existing ones are likely simple orders, we will map any weird state to 'pending' if it breaks
ALTER TABLE orders
  MODIFY status ENUM('pending', 'contacted', 'delivered', 'cancelled') DEFAULT 'pending';

-- Map existing 'is_active' to 'live' if active, 'upcoming' if not.
UPDATE drops SET status = 'live' WHERE is_active = 1;
UPDATE drops SET status = 'upcoming' WHERE is_active = 0;

-- Optionally, can drop is_active but let's keep it for legacy compat temporally if something references it
-- ALTER TABLE drops DROP COLUMN is_active;
