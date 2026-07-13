-- Takis Promotional System Schema (PostgreSQL)

DROP TABLE IF EXISTS security_logs CASCADE;
DROP TABLE IF EXISTS reward_codes CASCADE;
DROP TABLE IF EXISTS promo_codes CASCADE;
DROP TABLE IF EXISTS ticket_replies CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS redemptions CASCADE;
DROP TABLE IF EXISTS rewards CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(10),
    points INT DEFAULT 0,
    is_verified SMALLINT DEFAULT 0,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    otp VARCHAR(6),
    otp_expiry TIMESTAMP,
    session_version INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rewards Table
CREATE TABLE rewards (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    cost INT NOT NULL,
    stock INT NOT NULL,
    image_url VARCHAR(255),
    type VARCHAR(20) DEFAULT 'physical' CHECK (type IN ('physical', 'digital')),
    pdf_template VARCHAR(255),
    coordinates JSON,
    font_size INT DEFAULT 12,
    active SMALLINT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Redemptions (Orders)
CREATE TABLE redemptions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    reward_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'review', 'processing', 'shipped', 'delivered', 'completed')),
    shipping_details JSON,
    pdf_path VARCHAR(255),
    ip_address VARCHAR(45) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (reward_id) REFERENCES rewards(id)
);

-- Reward Codes (Digital)
CREATE TABLE reward_codes (
    id SERIAL PRIMARY KEY,
    redemption_id INT NOT NULL,
    code VARCHAR(50) NOT NULL,
    is_used SMALLINT DEFAULT 0,
    FOREIGN KEY (redemption_id) REFERENCES redemptions(id)
);

-- Promo Codes (Takis physical codes)
CREATE TABLE promo_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    points INT NOT NULL,
    is_used SMALLINT DEFAULT 0,
    used_by INT,
    used_at TIMESTAMP,
    FOREIGN KEY (used_by) REFERENCES users(id)
);

-- Support Tickets
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Support Ticket Replies
CREATE TABLE ticket_replies (
    id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL,
    user_id INT NOT NULL,
    reply TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Security Logs (Brute Force Protection)
CREATE TABLE security_logs (
    id SERIAL PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL,
    action VARCHAR(100) NOT NULL,
    attempts INT DEFAULT 1,
    last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_blocked SMALLINT DEFAULT 0
);

-- Admin Users Table (Manually managed)
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for updated_at on users table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for security_logs last_attempt
CREATE OR REPLACE FUNCTION update_last_attempt_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_attempt = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_security_logs_last_attempt BEFORE UPDATE ON security_logs
    FOR EACH ROW EXECUTE FUNCTION update_last_attempt_column();
