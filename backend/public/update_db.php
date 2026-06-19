<?php
// Script de actualización de base de datos para Takis
// Host: SiteGround localhost

$hostname = 'localhost';
$username = 'ubayhneffxygo';
$password = '1*@J$`r4:e`B';
$database = 'dbx7kmb408ygd7';

$conn = new mysqli($hostname, $username, $password, $database);

if ($conn->connect_error) {
    die(json_encode(['status' => 'error', 'message' => 'Error de conexión: ' . $conn->connect_error]));
}

$queries = [
    "CREATE TABLE IF NOT EXISTS admin_users (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )",
    "INSERT IGNORE INTO admin_users (username, email, password_hash) 
     VALUES (
        'admin_takis', 
        'admin@takis.com.mx', 
        '$2y$12$7eU/hmqhCYi0urCuxX02ueFi4jldDpLFKO2e7GccOd41Fnw5uhbVW'
     )"
];

$results = [];
foreach ($queries as $sql) {
    if ($conn->query($sql) === TRUE) {
        $results[] = "Operación exitosa: " . substr($sql, 0, 50) . "...";
    } else {
        $results[] = "Error en query: " . $conn->error;
    }
}

$conn->close();

echo json_encode(['status' => 'done', 'results' => $results]);
unlink(__FILE__); // Auto-destrucción por seguridad
