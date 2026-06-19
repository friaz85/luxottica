<?php
// Script simple para probar conexión a BD DEV
$host = 'localhost';
$user = 'uonwqgte71hjy';
$pass = '@j1222Cnidz#';
$db   = 'dbhdl78lgepg8e';

echo "<h1>Prueba de Conexión MySQL (DEV)</h1>";
echo "Intentando conectar a:<br>";
echo "Host: $host<br>";
echo "User: $user<br>";
echo "DB: $db<br>";

$mysqli = new mysqli($host, $user, $pass, $db);

if ($mysqli->connect_error) {
    echo "<h3 style='color:red'>ERROR DE CONEXIÓN:</h3>";
    echo $mysqli->connect_error;
} else {
    echo "<h3 style='color:green'>¡CONEXIÓN EXITOSA!</h3>";
    echo "Host Info: " . $mysqli->host_info . "<br>";

    // Probar query simple
    $result = $mysqli->query("SHOW TABLES");
    echo "<h4>Tablas encontradas (" . $result->num_rows . "):</h4>";
    while ($row = $result->fetch_array()) {
        echo $row[0] . "<br>";
    }

    $mysqli->close();
}
?>