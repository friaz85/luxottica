<?php
header('Content-Type: text/plain');
$host = 'localhost';
$db   = 'dbeisjvxfx8psg';
$user = 'u25gmeog7cyva';
$pass = '$2%1k|1hc3k4';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
    echo "Connection successful!\n";
    
    echo "\nAll tables in database:\n";
    $stmt = $pdo->query("SHOW TABLES");
    while ($row = $stmt->fetch(PDO::FETCH_NUM)) {
        $table = $row[0];
        echo "Table: $table\n";
        $describe = $pdo->query("DESCRIBE $table");
        while ($d = $describe->fetch(PDO::FETCH_ASSOC)) {
            echo "  {$d['Field']} - {$d['Type']}\n";
        }
    }
    
} catch (Exception $e) {
    echo "Connection failed: " . $e->getMessage() . "\n";
}
