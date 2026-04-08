-- DROP AND RECREATE ANNOUNCEMENTS TABLE FOR BACKEND BRIDGE
-- Run this in your MySQL client to fix the schema

DROP TABLE IF EXISTS announcements;

CREATE TABLE announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    version INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Seed the initial announcement
INSERT INTO announcements (id, title, message, is_enabled, version)
VALUES (1, 'NEW DROP IS HERE', 'Experience the latest "Faith Over Fear" collection. Limited pieces available.', true, 1);
