<?php
require 'app/Config/Database.php';
$db = \Config\Database::connect();

$tables = ['users', 'redemptions', 'rewards', 'security_logs'];

foreach ($tables as $table) {
    echo "--- Table: $table ---\n";
    try {
        $fields = $db->getFieldNames($table);
        foreach ($fields as $field) {
            echo "- $field\n";
        }
    } catch (\Exception $e) {
        echo "ERROR: " . $e->getMessage() . "\n";
    }
    echo "\n";
}
