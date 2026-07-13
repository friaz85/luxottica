-- Agregar campo de ip_address a redemptions
ALTER TABLE redemptions 
ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45) DEFAULT NULL;
