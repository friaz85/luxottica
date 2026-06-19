<?php
require 'app/Config/Paths.php';
$paths = new Config\Paths();
require rtrim($paths->systemDirectory, '\\/ ') . DIRECTORY_SEPARATOR . 'bootstrap.php';

// Load DotEnv
require_once SYSTEMPATH . 'Config/DotEnv.php';
$loader = new CodeIgniter\Config\DotEnv(ROOTPATH);
$loader->load();

echo "ROOTPATH: " . ROOTPATH . "\n";
echo "DB Driver: " . env('database.default.DBDriver') . "\n";
echo "DB Host: " . env('database.default.hostname') . "\n";
echo "DB User: " . env('database.default.username') . "\n";
echo "DB Name: " . env('database.default.database') . "\n";
