<?php
// Script de migración: agrega columna vigencia_area a reward_vigencias
$host = 'localhost';
$user = 'ughgtdncr7ro5';
$pass = 'mrL*1*P7ke&f';
$name = 'db4ccgnbnclgjg';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$name;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Verificar si la columna ya existe
    $check = $pdo->query("SHOW COLUMNS FROM reward_vigencias LIKE 'vigencia_area'");
    if ($check->rowCount() === 0) {
        $pdo->exec("ALTER TABLE reward_vigencias ADD COLUMN vigencia_area VARCHAR(500) NULL DEFAULT NULL");
        echo "✅ Columna vigencia_area agregada a reward_vigencias\n";
    } else {
        echo "ℹ️ La columna vigencia_area ya existe en reward_vigencias\n";
    }
    echo "Listo.\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
