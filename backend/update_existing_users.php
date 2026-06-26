<?php
/**
 * Migration script to update existing users and prepend the project prefix with a hyphen (e.g. pr3-).
 */

if (!defined('ENVIRONMENT')) {
    define('ENVIRONMENT', 'production');
}

// Minimal Bootstrap
require 'app/Config/Paths.php';
$paths = new \Config\Paths();
require rtrim($paths->systemDirectory, '\\/ ') . DIRECTORY_SEPARATOR . 'bootstrap.php';

try {
    $db = \Config\Database::connect();
    
    // Get all users
    $users = $db->table('users')->select('id, email, id_proyecto')->get()->getResultArray();
    
    echo "Total users found: " . count($users) . "\n";
    $updatedCount = 0;
    $skippedCount = 0;
    
    foreach ($users as $user) {
        $id = $user['id'];
        $email = trim($user['email']);
        $idProyecto = $user['id_proyecto'];
        
        if (empty($idProyecto)) {
            echo "Skipping User ID {$id} (no project assigned): {$email}\n";
            $skippedCount++;
            continue;
        }
        
        $prefix = 'PR' . $idProyecto . '-';
        
        // Clean up only the specific project prefix (with or without hyphen, case insensitive)
        $emailClean = preg_replace('/^(pr|PR)' . $idProyecto . '-?/i', '', $email);
        $newEmail = $prefix . $emailClean;
        
        if ($email !== $newEmail) {
            $db->table('users')->where('id', $id)->update(['email' => $newEmail]);
            echo "UPDATED User ID {$id}: '{$email}' -> '{$newEmail}'\n";
            $updatedCount++;
        } else {
            echo "No change needed for User ID {$id}: '{$email}'\n";
            $skippedCount++;
        }
    }
    
    echo "\n----------------------------------------\n";
    echo "Migration completed:\n";
    echo "Updated: {$updatedCount} users\n";
    echo "Skipped: {$skippedCount} users\n";
    echo "----------------------------------------\n";
    
} catch (\Exception $e) {
    echo "ERROR: " . $e->getMessage() . "\n";
}
