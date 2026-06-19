<?php
// Reset admin password
$host = 'localhost';
$db   = 'dbx7kmb408ygd7';
$user = 'ubayhneffxygo';
$pass = '1*@J$`r4:e`B';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    $username    = 'admin_takis';
    $newPassword = 'Admin2024!';
    $hash        = password_hash($newPassword, PASSWORD_BCRYPT);

    $stmt = $pdo->prepare("UPDATE admin_users SET password_hash = ? WHERE username = ?");
    $stmt->execute([$hash, $username]);

    echo "Password updated successfully for user: $username\n";
    echo "New password: $newPassword\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage();
}
