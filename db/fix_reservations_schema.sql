-- Add status column if it does not exist and ensure id is AUTO_INCREMENT
ALTER TABLE reservations MODIFY id INT AUTO_INCREMENT;

-- Add status column if it does not exist (this requires dropping and recreating if we don't use stored procedures, but typically ALTER TABLE ADD COLUMN ... can be done, we will just add it if missing or recreate)
-- A safer approach is just to run an ADD COLUMN wrapped or just run it and ignore error if it exists.
-- But standard way if we don't know:
ALTER TABLE reservations ADD COLUMN status VARCHAR(50) DEFAULT 'pending';
