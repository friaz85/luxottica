<?php
$host    = 'localhost';
$db      = 'dbx7kmb408ygd7';
$user    = 'ubayhneffxygo';
$pass    = '1*@J$`r4:e`B';
$charset = 'utf8mb4';

$dsn     = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    echo "Connected to DB.<br>";

    $stmt   = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Tables: " . implode(', ', $tables) . "<br>";

    if (in_array('users', $tables)) {
        $stmt = $pdo->query("DESCRIBE users");
        $cols = $stmt->fetchAll();
        echo "Users columns: " . implode(', ', array_column($cols, 'Field')) . "<br>";
    }

    if (in_array('admin_users', $tables)) {
        $stmt = $pdo->query("SELECT COUNT(*) FROM admin_users");
        echo "Admin users count: " . $stmt->fetchColumn() . "<br>";
    }

} catch (\Exception $e) {
    echo "Error: " . $e->getMessage();
}
