-- Takis Promotional System Schema

DROP TABLE IF EXISTS security_logs;
DROP TABLE IF EXISTS reward_codes;
DROP TABLE IF EXISTS promo_codes;
DROP TABLE IF EXISTS ticket_replies;
DROP TABLE IF EXISTS tickets;
DROP TABLE IF EXISTS redemptions;
DROP TABLE IF EXISTS rewards;
DROP TABLE IF EXISTS users;

-- Users Table
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    numero_exterior VARCHAR(100),
    numero_interior VARCHAR(100),
    colonia VARCHAR(255),
    municipio VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(10),
    points INT DEFAULT 0,
    is_verified TINYINT(1) DEFAULT 0,
    role ENUM('user', 'admin') DEFAULT 'user',
    otp VARCHAR(6),
    otp_expiry DATETIME,
    session_version INT DEFAULT 0,
    is_blocked TINYINT(1) DEFAULT 0,
    blocked_reason TEXT,
    blocked_at DATETIME,
    pin VARCHAR(255) DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Rewards Table
CREATE TABLE rewards (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cost INT NOT NULL,
    stock INT NOT NULL,
    image_url VARCHAR(255),
    type ENUM('physical', 'digital') DEFAULT 'physical',
    pdf_template VARCHAR(255),
    coordinates TEXT,
    code_areas TEXT,
    font_size INT DEFAULT 12,
    monto_recarga INT DEFAULT 0,
    active TINYINT(1) DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Redemptions (Orders)
CREATE TABLE redemptions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    reward_id INT UNSIGNED NOT NULL,
    status ENUM('pending', 'review', 'processing', 'shipped', 'delivered', 'completed') DEFAULT 'pending',
    shipping_details JSON,
    pdf_path VARCHAR(255),
    fecha_validez_inicio DATE DEFAULT NULL,
    fecha_validez_fin DATE DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reward_id) REFERENCES rewards(id)
);

-- Reward Codes (Digital)
CREATE TABLE reward_codes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    redemption_id INT UNSIGNED NOT NULL,
    code VARCHAR(50) NOT NULL,
    is_used TINYINT(1) DEFAULT 0,
    FOREIGN KEY (redemption_id) REFERENCES redemptions(id)
);

-- Promo Codes (Takis physical codes)
CREATE TABLE promo_codes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    points INT NOT NULL,
    is_used TINYINT(1) DEFAULT 0,
    used_by INT UNSIGNED,
    used_at DATETIME,
    FOREIGN KEY (used_by) REFERENCES users(id)
);

-- Support Tickets
CREATE TABLE tickets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status ENUM('open', 'closed') DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Support Ticket Replies
CREATE TABLE ticket_replies (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    reply TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Security Logs (Brute Force Protection)
CREATE TABLE security_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    action VARCHAR(100) NOT NULL,
    attempts INT DEFAULT 1,
    last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_blocked TINYINT(1) DEFAULT 0
);

-- Admin Users Table (Manually managed)
CREATE TABLE admin_users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);


