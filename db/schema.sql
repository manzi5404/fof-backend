-- =============================================================
-- Faith Over Fear — Complete Database Schema
-- Idempotent: safe to run on a fresh or existing database.
-- Table order respects foreign key dependencies.
-- =============================================================

-- 1. users
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name          VARCHAR(255),
    google_id     VARCHAR(255) UNIQUE,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. password_resets
CREATE TABLE IF NOT EXISTS password_resets (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    token      VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. drops
CREATE TABLE IF NOT EXISTS drops (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    image_url     VARCHAR(255),
    release_date  DATETIME,
    status        ENUM('upcoming', 'reservation', 'live', 'closed') DEFAULT 'upcoming',
    type          ENUM('new-drop', 'recent-drop') DEFAULT 'new-drop',
    collection_id INT DEFAULT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. products
CREATE TABLE IF NOT EXISTS products (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    drop_id     INT,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    price       DECIMAL(15, 2) NOT NULL,
    sizes       JSON,
    colors      JSON,
    image_urls  JSON,
    is_active   TINYINT(1) DEFAULT 1,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (drop_id) REFERENCES drops(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. orders
CREATE TABLE IF NOT EXISTS orders (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT,
    product_id     INT,
    drop_id        INT,
    product_name   VARCHAR(255),
    size           VARCHAR(20),
    color          VARCHAR(50),
    quantity       INT DEFAULT 1,
    customer_name  VARCHAR(255),
    customer_email VARCHAR(255),
    phone_number   VARCHAR(50),
    total_price    DECIMAL(15, 2),
    status         ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    payment_method VARCHAR(50) DEFAULT 'reservation',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. order_items
CREATE TABLE IF NOT EXISTS order_items (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    order_id   INT NOT NULL,
    product_id INT NOT NULL,
    quantity   INT NOT NULL,
    size       VARCHAR(10),
    price      DECIMAL(15, 2) NOT NULL,
    FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. reservations
CREATE TABLE IF NOT EXISTS reservations (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT DEFAULT NULL,
    full_name  VARCHAR(255),
    email      VARCHAR(255),
    phone      VARCHAR(50),
    product_id INT,
    size       VARCHAR(20),
    color      VARCHAR(50),
    quantity   INT DEFAULT 1,
    store_mode VARCHAR(50) DEFAULT 'live',
    status     ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. store_config  (singleton row: id = 1)
CREATE TABLE IF NOT EXISTS store_config (
    id                   INT PRIMARY KEY DEFAULT 1,
    store_mode           ENUM('live', 'reserve', 'closed') DEFAULT 'closed',
    announcement         TEXT,
    updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO store_config (id, store_mode, announcement)
VALUES (1, 'closed', 'Welcome to Faith Over Fear');

-- 9. settings
CREATE TABLE IF NOT EXISTS settings (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    `key`      VARCHAR(255) UNIQUE NOT NULL,
    `value`    VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO settings (`key`, `value`) VALUES ('purchasingDisabled', 'false');
INSERT IGNORE INTO settings (`key`, `value`) VALUES ('isRestocking', 'false');

-- 10. announcements  (singleton row: id = 1)
CREATE TABLE IF NOT EXISTS announcements (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(255),
    message     TEXT,
    image_url   VARCHAR(255),
    button_text VARCHAR(50) DEFAULT 'SHOP THE DROP',
    is_enabled  TINYINT(1) DEFAULT 1,
    version     INT DEFAULT 1,
    status      VARCHAR(50) DEFAULT 'live',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO announcements (id, title, message, button_text, is_enabled, version, status)
VALUES (1, 'NEW DROP IS HERE',
           'Experience the latest "Faith Over Fear" collection. Limited pieces available.',
           'SHOP THE DROP', 1, 1, 'live');

-- 11. notifications
CREATE TABLE IF NOT EXISTS notifications (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    type         VARCHAR(50),
    reference_id INT,
    title        VARCHAR(255),
    message      TEXT,
    is_read      TINYINT(1) DEFAULT 0,
    is_seen      TINYINT(1) DEFAULT 0,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. contact_messages
CREATE TABLE IF NOT EXISTS contact_messages (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    subject    VARCHAR(100),
    message    TEXT NOT NULL,
    status     ENUM('unread', 'read', 'replied') DEFAULT 'unread',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
