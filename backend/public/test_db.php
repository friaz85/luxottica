<?php
require 'index.php';
$db = \Config\Database::connect();
echo "Table Exists: " . ($db->tableExists('blocked_domains') ? 'YES' : 'NO') . "\n";
$domains = $db->table('blocked_domains')->get()->getResultArray();
print_r($domains);
