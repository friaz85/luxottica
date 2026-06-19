<?php
$hostname = "127.0.0.1";
$username = "u25gmeog7cyva";
$password = '$2%1k|1hc3k4';
$database = "dbeisjvxfx8psg";

$conn = new mysqli($hostname, $username, $password, $database);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "Adding id_recompensa to tblCodigoEntrada...<br>";

$queries = [
    "ALTER TABLE tblCodigoEntrada ADD COLUMN id_recompensa INT UNSIGNED NULL AFTER puntos",
    "ALTER TABLE tblCodigoEntrada ADD CONSTRAINT fk_entry_code_reward FOREIGN KEY (id_recompensa) REFERENCES rewards(id) ON DELETE SET NULL"
];

foreach ($queries as $sql) {
    if ($conn->query($sql) === TRUE) {
        echo "Query successful: $sql<br>";
    } else {
        echo "Error: " . $conn->error . " in query: " . $sql . "<br>";
    }
}

echo "Migration complete.";
$conn->close();
?>
