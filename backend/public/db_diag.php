<?php
// Script de Diagnóstico Avanzado de Base de Datos
error_reporting(E_ALL);
ini_set('display_errors', 1);

$user = 'uja2i2v274lkm';
$pass = '31q)+2&I&5%4';
$db   = 'dbemgylpsiadtp';

echo "<h1>Diagnóstico de Conexión MySQL</h1>";
echo "<h2>Intentando conectar con usuario: $user</h2>";

// Prueba 1: Localhost
test_connection('localhost', $user, $pass, $db);

// Prueba 2: IP Loopback
test_connection('127.0.0.1', $user, $pass, $db);

function test_connection($host, $u, $p, $d)
{
    echo "<h3>Probando Host: $host ...</h3>";
    try {
        $mysqli = new mysqli($host, $u, $p, $d);
        if ($mysqli->connect_error) {
            echo "<div style='color:red; border:1px solid red; padding:10px;'>";
            echo "❌ FALLÓ: " . $mysqli->connect_error . "</div>";
        } else {
            echo "<div style='color:green; border:1px solid green; padding:10px;'>";
            echo "✅ ÉXITO: Conexión establecida correctamente.<br>";
            echo "Host info: " . $mysqli->host_info;
            $mysqli->close();
            echo "</div>";
        }
    } catch (Exception $e) {
        echo "<div style='color:red; border:1px solid red; padding:10px;'>";
        echo "❌ EXCEPCIÓN: " . $e->getMessage() . "</div>";
    }
}
?>