<?php
// Debug script for PROD PDF generation environment
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Content-Type: text/plain");
echo "--- TAKIS PROD DIAGNOSTIC ---\n\n";

// 1. Check Disk Space
$freeSpace = disk_free_space(".");
$totalSpace = disk_total_space(".");
echo "Disk Space:\n";
echo "Free: " . round($freeSpace / 1024 / 1024, 2) . " MB\n";
echo "Total: " . round($totalSpace / 1024 / 1024, 2) . " MB\n";
if ($freeSpace < 50 * 1024 * 1024) {
    echo "WARNING: Low disk space!\n";
}
echo "\n";

// 2. Check Paths & Permissions
$basePath = realpath(__DIR__ . '/..');
if (!$basePath) {
    // If running from api/public, __DIR__ is api/public, so __DIR__/.. is api
    $basePath = realpath(__DIR__);
}
echo "Base Path: " . $basePath . "\n\n";

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

// 3. Check specific template for Cine (Reward ID 23 typically uses 'Cine_2x1.pdf' or similar)
echo "Templates Directory Content:\n";
$templatesDir = $basePath . '/uploads/templates';
if (is_dir($templatesDir)) {
    $files = scandir($templatesDir);
    foreach ($files as $f) {
        if ($f !== '.' && $f !== '..') {
            echo "  - " . $f . " (" . filesize($templatesDir . '/' . $f) . " bytes)\n";
        }
    }
}
echo "\n";

// 4. Test Write
echo "Write Test (redeemed dir):\n";
$testFile = $basePath . '/uploads/redeemed/test_write_' . time() . '.txt';
if (@file_put_contents($testFile, "test")) {
    echo "  Success: Can write to redeemed dir.\n";
    unlink($testFile);
} else {
    echo "  FAILED: Cannot write to redeemed dir. Error: " . error_get_last()['message'] . "\n";
}

echo "\n--- END DIAGNOSTIC ---\n";
