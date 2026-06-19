<?php
/**
 * Surgical PDO update script (Actual PROD credentials)
 */

$host = 'localhost';
$db   = 'dbemgylpsiadtp'; 
$user = 'uja2i2v274lkm'; 
$pass = '31q)+2&I&5%4'; 

$points = $argv[1] ?? 'stats';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    if (is_numeric($points)) {
        echo "STARTING UPDATE: Setting points = $points for all unused codes...\n";
        $stmt = $pdo->prepare("UPDATE promo_codes SET points = ? WHERE is_used = 0");
        $stmt->execute([(int)$points]);
        $affectedRows = $stmt->rowCount();
        echo "SUCCESS: Updated $affectedRows unused promo codes to $points points.\n";
    }

    // Verification / Stats
    $verify = $pdo->query("SELECT points, COUNT(*) as qty FROM promo_codes WHERE is_used = 0 GROUP BY points");
    echo "Current points distribution for unused codes (is_used = 0):\n";
    $found = false;
    while ($row = $verify->fetch(PDO::FETCH_ASSOC)) {
        echo "Points: {$row['points']} | Count: {$row['qty']}\n";
        $found = true;
    }
    if (!$found) echo "No unused codes found.\n";

} catch (PDOException $e) {
    echo "DATABASE ERROR: " . $e->getMessage() . "\n";
}
