<?php
/**
 * Standalone web-based script for promo updates
 * because CLI environment on this server is currently unusable.
 */

define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);
chdir(__DIR__);

// Use the exact same bootstrapping as index.php
require 'app/Config/Paths.php';
$paths = new Config\Paths();
require rtrim($paths->systemDirectory, '\\/ ') . DIRECTORY_SEPARATOR . 'bootstrap.php';

// DotEnv and Environment setup
require_once SYSTEMPATH . 'Config/DotEnv.php';
(new CodeIgniter\Config\DotEnv(ROOTPATH))->load();

if (!defined('ENVIRONMENT')) {
    define('ENVIRONMENT', env('CI_ENVIRONMENT', 'production'));
}

// Logic
use App\Models\PromoCodeModel;

$points = $_GET['points'] ?? 1;

if (!is_numeric($points)) {
    die("Error: points parameter must be numeric");
}

$promoModel = new PromoCodeModel();

try {
    $promoModel->where('is_used', 0)
              ->set(['points' => (int)$points])
              ->update();
    
    $affectedRows = $promoModel->db->affectedRows();
    echo "SUCCESS: Updated $affectedRows promo codes to $points points.\n";
    
} catch (\Exception $e) {
    echo "DATABASE ERROR: " . $e->getMessage();
}
