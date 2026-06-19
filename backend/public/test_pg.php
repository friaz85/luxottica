<?php
$dsn  = "pgsql:host=localhost;port=5432;dbname=dbjv4vqfqbqfgj";
$user = "uhyhullgum8ns";
$pass = "Or1144ck3@@b";

try {
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    echo "Conexión exitosa a PostgreSQL.\n";

    $stmt   = $pdo->query("SELECT id, username FROM admin_users");
    $admins = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Usuarios Admin encontrados: " . count($admins) . "\n";
    foreach ($admins as $admin) {
        echo "- ID: {$admin['id']}, User: {$admin['username']}\n";
    }
} catch (PDOException $e) {
    echo "Error de conexión: " . $e->getMessage() . "\n";
}
