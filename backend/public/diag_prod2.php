<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: text/plain");
echo "--- TAKIS PROD DIAGNOSTIC 2 ---\n\n";

$basePath = realpath(__DIR__);
echo "Base Path (api directory): " . $basePath . "\n\n";

$dirsToCheck = [
    $basePath . '/uploads',
    $basePath . '/uploads/redeemed',
    $basePath . '/uploads/templates',
    $basePath . '/writable',
    $basePath . '/writable/logs'
];

echo "Directory Status:\n";
foreach ($dirsToCheck as $dir) {
    echo "- " . $dir . "\n";
    if (is_dir($dir)) {
        echo "  Exists: YES\n";
        echo "  Writable: " . (is_writable($dir) ? "YES" : "NO") . "\n";
        echo "  Permissions: " . substr(sprintf('%o', fileperms($dir)), -4) . "\n";
    } else {
        echo "  Exists: NO\n";
    }
}
echo "\n";

echo "Templates Directory Content:\n";
$templatesDir = $basePath . '/uploads/templates';
if (is_dir($templatesDir)) {
    $files = scandir($templatesDir);
    foreach ($files as $f) {
        if ($f !== '.' && $f !== '..') {
            echo "  - " . $f . " (" . filesize($templatesDir . '/' . $f) . " bytes)\n";
        }
    }
} else {
    echo "  Templates directory not found.\n";
}
echo "\n";

echo "Write Test (redeemed dir):\n";
$testFile = $basePath . '/uploads/redeemed/test_write_' . time() . '.txt';
if (@file_put_contents($testFile, "test")) {
    echo "  Success: Can write to redeemed dir.\n";
    unlink($testFile);
} else {
    echo "  FAILED: Cannot write to redeemed dir. Error: " . (error_get_last()['message'] ?? 'Unknown error') . "\n";
}

echo "\n--- END DIAGNOSTIC 2 ---\n";
