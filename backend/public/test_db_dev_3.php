<?php
header('Content-Type: text/plain');
$host = 'localhost';
$db   = 'dbeisjvxfx8psg';
$user = 'u25gmeog7cyva';
$pass = '$2%1k|1hc3k4';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db", $user, $pass);
    echo "Connection successful!\n";
    
    $email = 'embajador@tec.mx';
    $stmt = $pdo->prepare("SELECT email, password_hash, role FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if ($user) {
        echo "User found: " . $user['email'] . "\n";
        echo "Role: " . $user['role'] . "\n";
        echo "Has hash: " . (empty($user['password_hash']) ? "No" : "Yes") . "\n";
    } else {
        echo "User NOT found: $email\n";
    }
    
} catch (Exception $e) {
    echo "Connection failed: " . $e->getMessage() . "\n";
}
