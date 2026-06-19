<?php

// Standalone migration runner for when spark fails due to socket issues
$hostname = "localhost";
$username = "u25gmeog7cyva";
$password = '$2%1k|1hc3k4';
$database = "dbeisjvxfx8psg";

$conn = new mysqli($hostname, $username, $password, $database);

if ($conn->connect_error) {
    // Try 127.0.0.1
    $conn = new mysqli("127.0.0.1", $username, $password, $database);
    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }
}

echo "Running custom migrations...<br>";

$queries = [
    // Migration 1: Add id_recompensa to tblCodigoEntrada
    "ALTER TABLE tblCodigoEntrada ADD COLUMN id_recompensa INT UNSIGNED NULL AFTER puntos",
    "ALTER TABLE tblCodigoEntrada ADD CONSTRAINT fk_entry_code_reward FOREIGN KEY (id_recompensa) REFERENCES rewards(id) ON DELETE SET NULL",
    
    // Migration 2: Add id_proyecto to rewards
    "ALTER TABLE rewards ADD COLUMN id_proyecto INT UNSIGNED NULL AFTER id",
    "ALTER TABLE rewards ADD CONSTRAINT fk_reward_project FOREIGN KEY (id_proyecto) REFERENCES tblProyecto(idProyecto) ON DELETE SET NULL"
];

foreach ($queries as $sql) {
    if ($conn->query($sql) === TRUE) {
        echo "✅ Success: $sql<br>";
    } else {
        echo "❌ Error: " . $conn->error . " in query: " . $sql . "<br>";
    }
}

echo "<br>Done.";
$conn->close();
?>
