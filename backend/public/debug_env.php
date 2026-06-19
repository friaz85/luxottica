<?php
define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);
chdir(__DIR__);
require FCPATH . 'app/Config/Paths.php';
$paths = new Config\Paths();
require $paths->systemDirectory . '/bootstrap.php';

echo "ROOTPATH: " . ROOTPATH . "\n";
if (file_exists(ROOTPATH . '.env'))
    echo ".env FOUND at ROOTPATH\n";
else
    echo ".env NOT FOUND at ROOTPATH\n";

// Check local dir
if (file_exists(__DIR__ . '/.env'))
    echo ".env FOUND at __DIR__\n";

require_once SYSTEMPATH . 'Config/DotEnv.php';
try {
    $dotenv = new CodeIgniter\Config\DotEnv(ROOTPATH);
    $dotenv->load();
    echo "DotEnv Loaded.\n";
} catch (\Throwable $e) {
    echo "DotEnv Error: " . $e->getMessage() . "\n";
}

echo "ENV CI_ENVIRONMENT: " . getenv('CI_ENVIRONMENT') . "\n";
echo "SERVER CI_ENVIRONMENT: " . $_SERVER['CI_ENVIRONMENT'] . "\n";
