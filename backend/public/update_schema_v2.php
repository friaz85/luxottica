<?php
// Script de actualización de esquema v2 para Takis (Prod/SG)
$hostname = 'localhost';
$username = 'ubayhneffxygo';
$password = '1*@J$`r4:e`B';
$database = 'dbx7kmb408ygd7';

$conn = new mysqli($hostname, $username, $password, $database);

if ($conn->connect_error) {
    die("Error de conexión: " . $conn->connect_error);
}

$queries = [
    "ALTER TABLE rewards ADD COLUMN IF NOT EXISTS active TINYINT(1) DEFAULT 1",
    "ALTER TABLE rewards ADD COLUMN IF NOT EXISTS code_areas TEXT"
];

echo "<h3>Actualizando Base de Datos...</h3>";
foreach ($queries as $sql) {
    if ($conn->query($sql) === TRUE) {
        echo "✅ Éxito: $sql\n";
    } else {
        echo "❌ Error: " . $conn->error . " ($sql)\n";
    }
}

$conn->close();
echo "\nProceso terminado.\n";
