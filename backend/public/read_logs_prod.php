<?php
header("Content-Type: text/plain");
$logDir = __DIR__ . '/writable/logs/';
$files = glob($logDir . '*.log');
if (empty($files)) {
    echo "No log files found.\n";
    exit;
}
rsort($files); // Get the newest file
$latestLog = $files[0];
echo "Reading: " . basename($latestLog) . "\n\n";

// Tail the last 200 lines
$lines = file($latestLog);
$tail = array_slice($lines, -200);
foreach ($tail as $line) {
    echo $line;
}
