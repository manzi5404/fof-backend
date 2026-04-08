CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type ENUM('reservation', 'message', 'payment') NOT NULL,
    reference_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    is_seen BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);