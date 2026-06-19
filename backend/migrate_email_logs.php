<?php
// Standalone DB Migration for Email Campaign Logs
$host = '127.0.0.1';
$user = 'ubayhneffxygo';
$pass = '1*@J$`r4:e`B';
$db   = 'dbx7kmb408ygd7';

$conn = new mysqli($host, $user, $pass, $db);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "Connected successfully to $db\n";

$sql = "CREATE TABLE IF NOT EXISTS email_campaign_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NULL,
    email VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP
);";

if ($conn->query($sql) === TRUE) {
    echo "Table email_campaign_logs created successfully\n";
} else {
    echo "Error creating table: " . $conn->error . "\n";
}

$conn->close();
?>
