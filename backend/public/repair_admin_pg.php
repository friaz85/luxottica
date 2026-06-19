<?php
// Script de reparación de admin para Takis (DEV - PostgreSQL)
$host = 'localhost';
$port = '5432';
$db   = 'dbjv4vqfqbqfgj';
$user = 'uhyhullgum8ns';
$pass = 'Or1144ck3@@b';

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$db";
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    echo "Conexión exitosa a PostgreSQL.\n";

    // 1. Asegurar que la tabla existe
    $pdo->exec("CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // 2. Insertar o actualizar el usuario admin_takis
    $username       = 'admin_takis';
    $email          = 'admin@takis.com.mx';
    $password_plain = 'Admin2024!';
    $hash           = password_hash($password_plain, PASSWORD_BCRYPT);

    $stmt = $pdo->prepare("SELECT id FROM admin_users WHERE username = ?");
    $stmt->execute([$username]);
    $row = $stmt->fetch();

    if ($row) {
        $stmt = $pdo->prepare("UPDATE admin_users SET password_hash = ?, email = ? WHERE username = ?");
        $stmt->execute([$hash, $email, $username]);
        echo "Usuario Admin actualizado correctamente.\n";
    } else {
        $stmt = $pdo->prepare("INSERT INTO admin_users (username, email, password_hash) VALUES (?, ?, ?)");
        $stmt->execute([$username, $email, $hash]);
        echo "Usuario Admin creado correctamente.\n";
    }

    echo "Username: $username\n";
    echo "Password: $password_plain\n";

} catch (PDOException $e) {
    die("Error: " . $e->getMessage());
}
