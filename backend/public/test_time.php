<?php
// DB Timezone Web Check
header('Content-Type: application/json');

define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);
chdir(__DIR__);
require FCPATH . '../app/Config/Paths.php';
$paths = new Config\Paths();
require rtrim($paths->systemDirectory, '\\/ ') . DIRECTORY_SEPARATOR . 'bootstrap.php';

$db = \Config\Database::connect();
// The BaseController logic isn't triggered here because it's a standalone file, 
// so let's check it through a real route if possible, or just mock it here.

$db->query("SET time_zone = '-06:00'");
$res = $db->query("SELECT NOW() as now")->getRow();

echo json_encode([
    'php_time' => date('Y-m-d H:i:s'),
    'db_time'  => $res->now,
    'timezone' => date_default_timezone_get()
]);
?>