<?php
// Test CI4 connection logic
require 'app/Config/Paths.php';
$paths = new Config\Paths();
require rtrim($paths->systemDirectory, '\\/ ') . DIRECTORY_SEPARATOR . 'bootstrap.php';

$dbConfig = new \Config\Database();
echo "Default Group: " . $dbConfig->defaultGroup . "\n";
$conn = $dbConfig->default;
echo "Driver: " . $conn['DBDriver'] . "\n";
echo "Host: " . $conn['hostname'] . "\n";
echo "User: " . $conn['username'] . "\n";
echo "DB: " . $conn['database'] . "\n";

try {
    $db = \Config\Database::connect();
    echo "Connection test: Success!\n";
    $query = $db->query("SELECT current_user");
    print_r($query->getRow());
} catch (\Exception $e) {
    echo "Connection test: FAILED!\n";
    echo $e->getMessage() . "\n";
}
