<?php
// Script to count users in segments using CI4 Services
define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);
chdir(__DIR__);
if (!defined('ENVIRONMENT')) {
    define('ENVIRONMENT', 'production');
}
require __DIR__ . '/app/Config/Paths.php';
$paths = new Config\Paths();
require rtrim($paths->systemDirectory, '\\/ ') . DIRECTORY_SEPARATOR . 'bootstrap.php';
if (file_exists(ROOTPATH . '.env')) {
    require_once SYSTEMPATH . 'Config/DotEnv.php';
    (new CodeIgniter\Config\DotEnv(ROOTPATH))->load();
}

$db = \Config\Database::connect();

$highCount = $db->table('users')
    ->where('points >=', 300)
    ->where('points <=', 500)
    ->countAllResults();

$lowCount = $db->table('users')
    ->where('points >=', 0)
    ->where('points <=', 100)
    ->countAllResults();

echo "--- User Segments ---\n";
echo "High Points (300-500): $highCount users\n";
echo "Low Points (0-100): $lowCount users\n";
echo "----------------------\n";
