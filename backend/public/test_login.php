<?php
// Script de prueba de login backend
require 'app/Config/Paths.php';
$paths = new Config\Paths();
require rtrim($paths->systemDirectory, '\\/ ') . DIRECTORY_SEPARATOR . 'bootstrap.php';
require_once SYSTEMPATH . 'Config/DotEnv.php';
(new CodeIgniter\Config\DotEnv(ROOTPATH))->load();

$app = Config\Services::codeigniter();
$app->initialize();

$db       = \Config\Database::connect();
$username = 'admin_takis';
$password = 'Admin2024!';

$query = $db->table('admin_users')->where('username', $username)->get();
$user  = $query->getRowArray();

if (!$user) {
    die("Usuario no encontrado en la DB.\n");
}

if (password_verify($password, $user['password_hash'])) {
    echo "Login exitoso (password_verify OK).\n";
} else {
    echo "Falla en password_verify.\n";
    echo "Hash en DB: " . $user['password_hash'] . "\n";
}
