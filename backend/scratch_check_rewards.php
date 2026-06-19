<?php

define('ENVIRONMENT', 'development');
define('FCPATH', __DIR__ . '/public/');

require __DIR__ . '/vendor/codeigniter4/framework/system/Test/bootstrap.php';

$db = \Config\Database::connect();
$query = $db->query("SELECT id, title, type, pdf_template, image_url FROM rewards");
$results = $query->getResultArray();

echo json_encode($results, JSON_PRETTY_PRINT);
