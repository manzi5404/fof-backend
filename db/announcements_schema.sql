CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    button_text VARCHAR(50),
    button_link VARCHAR(255),
    version VARCHAR(50) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial announcement state
INSERT INTO announcements (title, message, button_text, button_link, version, enabled)
VALUES ('NEW DROP IS HERE', 'Experience the latest "Faith Over Fear" collection. Limited pieces available.', 'Shop Now', '/shop.html', 'v1.0.0', true);
