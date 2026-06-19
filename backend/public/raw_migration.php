<?php
header('Content-Type: text/plain; charset=utf-8');
echo "Iniciando script...\n";

$db = @mysqli_connect('localhost', 'u25gmeog7cyva', '$2%1k|1hc3k4', 'dbeisjvxfx8psg', null, '/tmp/mysql.sock');
if (!$db) {
    die("Error de conexión: " . mysqli_connect_error());
}
echo "¡Conectado a MySQL!\n\n";

function addColumn($db, $table, $column, $definition) {
    $res = mysqli_query($db, "SHOW COLUMNS FROM `$table` LIKE '$column'");
    if (mysqli_num_rows($res) == 0) {
        $sql = "ALTER TABLE `$table` ADD COLUMN `$column` $definition";
        if (mysqli_query($db, $sql)) {
            echo "✅ $table: Columna '$column' agregada.\n";
        } else {
            echo "❌ $table: Error al agregar '$column': " . mysqli_error($db) . "\n";
        }
    } else {
        echo "ℹ️ $table: Columna '$column' ya existe.\n";
    }
}

// Reward Codes
for ($i = 1; $i <= 8; $i++) {
    addColumn($db, 'reward_codes', "code$i", "VARCHAR(255) DEFAULT NULL");
}

// Rewards
addColumn($db, 'rewards', 'codes_count', "INT DEFAULT 1");
addColumn($db, 'rewards', 'coordinates', "TEXT DEFAULT NULL");
addColumn($db, 'rewards', 'code_areas', "TEXT DEFAULT NULL");
addColumn($db, 'rewards', 'font_size', "INT DEFAULT 12");

// tblCodigoEntrada (instead of promo_codes)
addColumn($db, 'tblCodigoEntrada', 'used_ip', "VARCHAR(45) DEFAULT NULL");

mysqli_close($db);
echo "\nScript finalizado.";
?>
