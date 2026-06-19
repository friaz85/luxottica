-- Migraciones para nuevas funcionalidades del Admin
-- Ejecutar en orden

-- 1. Agregar campos de tracking a redemptions
ALTER TABLE redemptions 
ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(100) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tracking_url VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS delivery_date DATE DEFAULT NULL;

-- 2. Agregar campos de bloqueo a users
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_blocked TINYINT(1) DEFAULT 0,
ADD COLUMN IF NOT EXISTS blocked_reason VARCHAR(255) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS blocked_at DATETIME DEFAULT NULL;

-- 3. Crear índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON redemptions(status);
CREATE INDEX IF NOT EXISTS idx_users_blocked ON users(is_blocked);
CREATE INDEX IF NOT EXISTS idx_security_logs_action_date ON security_logs(action, created_at);

-- 4. Agregar campo para almacenar el nombre del destinatario en redemptions
ALTER TABLE redemptions
ADD COLUMN IF NOT EXISTS recipient_name VARCHAR(255) DEFAULT NULL;
