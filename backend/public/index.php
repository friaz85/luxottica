<?php

/**
 * CodeIgniter 4 Web Bootstrap
 */

// CORS GLOBAL
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER["REQUEST_METHOD"] == "OPTIONS") {
    exit;
}

// Set Environment (Earliest possible to avoid naming conflicts in early class loading)
if (!defined('ENVIRONMENT')) {
    define('ENVIRONMENT', 'production');
}

define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);
chdir(__DIR__);

// Load Paths
if (file_exists(FCPATH . 'app/Config/Paths.php')) {
    require FCPATH . 'app/Config/Paths.php';
} else {
    require FCPATH . '../app/Config/Paths.php';
}

$paths = new Config\Paths();

// Bootstrap the framework
require rtrim($paths->systemDirectory, '\\/ ') . DIRECTORY_SEPARATOR . 'bootstrap.php';

// Load DotEnv
require_once SYSTEMPATH . 'Config/DotEnv.php';
(new CodeIgniter\Config\DotEnv(ROOTPATH))->load();

// Set Mexico timezone (UTC-6)
date_default_timezone_set('America/Mexico_City');

// Enable errors if not in production
if (ENVIRONMENT !== 'production') {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
}

// Load Composer Autoload
if (file_exists(ROOTPATH . 'vendor/autoload.php')) {
    require_once ROOTPATH . 'vendor/autoload.php';
}

$app = Config\Services::codeigniter();
$app->initialize();
$context = is_cli() ? 'php-cli' : 'web';
$app->setContext($context);
$app->run();
