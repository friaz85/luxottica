<?php
/**
 * Surgical promo update and verification script
 */

// Define ENVIRONMENT early to avoid Config/Database naming issues
if (!defined('ENVIRONMENT')) {
    define('ENVIRONMENT', 'production');
}

// Minimal Bootstrap
require 'app/Config/Paths.php';
$paths = new \Config\Paths();
require rtrim($paths->systemDirectory, '\\/ ') . DIRECTORY_SEPARATOR . 'bootstrap.php';

// Logic
$points = $argv[1] ?? 1;
if (!is_numeric($points)) {
    die("Error: points argument must be numeric.\n");
}

try {
    $db = \Config\Database::connect();
    
    // Update
    $db->query("UPDATE promo_codes SET points = ? WHERE is_used = 0", [(int)$points]);
    $affected = $db->affectedRows();
    
    echo "SUCCESS: Updated $affected unused promo codes to $points points.\n";
    
    // Final Count
    $counts = $db->query("SELECT points, COUNT(*) as qty FROM promo_codes WHERE is_used = 0 GROUP BY points")->getResult();
    echo "Current points distribution for unused codes:\n";
    foreach ($counts as $row) {
        echo "Points: {$row->points} | Count: {$row->qty}\n";
    }
    
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
