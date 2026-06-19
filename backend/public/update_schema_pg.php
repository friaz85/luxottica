<?php
// Script de actualización de esquema v2 para Takis (PostgreSQL)
$host = 'localhost';
$port = '5432';
$db   = 'dbjv4vqfqbqfgj';
$user = 'uhyhullgum8ns';
$pass = 'Or1144ck3@@b';

try {
    $dsn = "pgsql:host=$host;port=$port;dbname=$db";
    $pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

    echo "<h3>Actualizando Base de Datos (PostgreSQL)...</h3>";

    // Verificar si las columnas existen antes de agregarlas
    $queries = [
        "ALTER TABLE rewards ADD COLUMN IF NOT EXISTS active SMALLINT DEFAULT 1",
        "ALTER TABLE rewards ADD COLUMN IF NOT EXISTS code_areas TEXT"
    ];

    foreach ($queries as $sql) {
        try {
            $pdo->exec($sql);
            echo "✅ Éxito: $sql\n";
        } catch (PDOException $e) {
            echo "❌ Error: " . $e->getMessage() . " ($sql)\n";
        }
    }

    echo "\nProceso terminado.\n";

} catch (PDOException $e) {
    die("Error: " . $e->getMessage());
}
