<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

$host = 'localhost';
$user = 'ubayhneffxygo';
$pass = '1*@J$`r4:e`B';
$db   = 'dbx7kmb408ygd7';
$port = 3306;

$mysqli = new mysqli($host, $user, $pass, $db, $port);

if ($mysqli->connect_error) {
    die('Connect Error (' . $mysqli->connect_errno . ') ' . $mysqli->connect_error);
}

echo 'Success... ' . $mysqli->host_info . "\n";
if ($result = $mysqli->query("SELECT * FROM admin_users")) {
    echo "Admin users count: " . $result->num_rows;
} else {
    echo "Error querying table: " . $mysqli->error;
}
$mysqli->close();
?>