<?php
// Script de reparación de admin para Takis (DEV)
$hostname = 'localhost';
$username = 'uhyhullgum8ns';
$password = 'Or1144ck3@@b';
$database = 'dbjv4vqfqbqfgj';

$conn = new mysqli($hostname, $username, $password, $database);

if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

// 1. Asegurar que la tabla existe (por si acaso)
$conn->query("CREATE TABLE IF NOT EXISTS admin_users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)");

// 2. Insertar o actualizar el usuario admin_takis
$username       = 'admin_takis';
$email          = 'admin@takis.com.mx';
$password_plain = 'Admin2024!';
$hash           = password_hash($password_plain, PASSWORD_BCRYPT);

$check = $conn->query("SELECT id FROM admin_users WHERE username = '$username'");

if ($check->num_rows > 0) {
    $conn->query("UPDATE admin_users SET password_hash = '$hash', email = '$email' WHERE username = '$username'");
    echo "Usuario Admin actualizado correctamente.\n";
} else {
    $conn->query("INSERT INTO admin_users (username, email, password_hash) VALUES ('$username', '$email', '$hash')");
    echo "Usuario Admin creado correctamente.\n";
}

echo "Username: $username\n";
echo "Password: $password_plain\n";

$conn->close();
