<?php
/**
 * DB Migration to add project 'activo' column and create admin activity logs table.
 */

if (!defined('ENVIRONMENT')) {
    define('ENVIRONMENT', 'production');
}

// Minimal Bootstrap
require 'app/Config/Paths.php';
$paths = new \Config\Paths();
require rtrim($paths->systemDirectory, '\\/ ') . DIRECTORY_SEPARATOR . 'bootstrap.php';

try {
    $db = \Config\Database::connect();
    
    echo "--- Running Database Schema Updates ---\n";

    // 1. Add 'activo' column to tblProyecto if not exists
    $fields = $db->getFieldNames('tblProyecto');
    if (!in_array('activo', $fields)) {
        $db->query("ALTER TABLE tblProyecto ADD COLUMN activo TINYINT(1) DEFAULT 1");
        echo "SUCCESS: Added 'activo' column to tblProyecto table.\n";
    } else {
        echo "INFO: 'activo' column already exists in tblProyecto table.\n";
    }

    // 2. Create admin_activity_logs table if not exists
    $db->query("CREATE TABLE IF NOT EXISTS admin_activity_logs (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        admin_id INT UNSIGNED NULL,
        admin_username VARCHAR(100) NOT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        ip_address VARCHAR(45) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    echo "SUCCESS: Checked/Created admin_activity_logs table.\n";

    echo "--- Database migration completed successfully ---\n";

} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
