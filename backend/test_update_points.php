<?php
/**
 * Test script to run promo update points logic directly
 * to bypass Spark command discovery issues.
 */

// Basic bootstrap
require 'app/Config/Paths.php';
$paths = new \Config\Paths();
require rtrim($paths->systemDirectory, '\\/ ') . DIRECTORY_SEPARATOR . 'bootstrap.php';

// Custom logic
use App\Models\PromoCodeModel;

// Get points from argv or default to 1
$points = $argv[1] ?? 1;

if (!is_numeric($points)) {
    echo "Error: Points must be a numeric value.\n";
    exit(1);
}

$promoModel = new PromoCodeModel();

echo "Starting points update to $points...\n";

try {
    // Run the update
    $promoModel->where('is_used', 0)
              ->set(['points' => (int)$points])
              ->update();
    
    $affectedRows = $promoModel->db->affectedRows();
    echo "Success: Points updated to $points for $affectedRows unused codes.\n";
    
} catch (\Exception $e) {
    echo "Database Error: " . $e->getMessage() . "\n";
}
