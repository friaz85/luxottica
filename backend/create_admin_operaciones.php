<?php
// Script: crea usuario admin "operaciones" en la BD de producción local
$host = 'localhost';
$user = 'ughgtdncr7ro5';
$pass = 'mrL*1*P7ke&f';
$name = 'db4ccgnbnclgjg';

$username  = 'operaciones';
$email     = 'operaciones@luxottica.com';
$password  = 'Operaciones2026!';
$role      = 'quantum'; // acceso admin estándar (no system_admin)

try {
    $pdo = new PDO("mysql:host=$host;dbname=$name;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Verificar si ya existe
    $check = $pdo->prepare("SELECT id FROM admin_users WHERE username = ?");
    $check->execute([$username]);
    if ($check->rowCount() > 0) {
        echo "⚠️  El usuario '{$username}' ya existe.\n";
        exit(0);
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO admin_users (username, email, password_hash, role) VALUES (?, ?, ?, ?)");
    $stmt->execute([$username, $email, $hash, $role]);

    echo "✅ Usuario admin creado exitosamente\n";
    echo "   Usuario:    {$username}\n";
    echo "   Email:      {$email}\n";
    echo "   Contraseña: {$password}\n";
    echo "   Rol:        {$role}\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
