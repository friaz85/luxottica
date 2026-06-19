<?php
// Script to create the logs table using CI4 Database Service
define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);
chdir(__DIR__);
if (!defined('ENVIRONMENT')) {
    define('ENVIRONMENT', 'production');
}
require __DIR__ . '/app/Config/Paths.php';
$paths = new Config\Paths();
require rtrim($paths->systemDirectory, '\\/ ') . DIRECTORY_SEPARATOR . 'bootstrap.php';
if (file_exists(ROOTPATH . '.env')) {
    require_once SYSTEMPATH . 'Config/DotEnv.php';
    (new CodeIgniter\Config\DotEnv(ROOTPATH))->load();
}

$db = \Config\Database::connect();
$forge = \Config\Database::forge();

$fields = [
    'id' => [
        'type'           => 'INT',
        'constraint'     => 11,
        'unsigned'       => true,
        'auto_increment' => true,
    ],
    'user_id' => [
        'type'       => 'INT',
        'constraint'     => 11,
        'unsigned'   => true,
        'null'       => true,
    ],
    'email' => [
        'type'       => 'VARCHAR',
        'constraint' => '255',
    ],
    'campaign_type' => [
        'type'       => 'VARCHAR',
        'constraint' => '50',
    ],
    'sent_at' => [
        'type' => 'DATETIME',
        'null' => true,
    ],
];

$forge->addField($fields);
$forge->addKey('id', true);
$forge->createTable('email_campaign_logs', true);

echo "Table email_campaign_logs created successfully using CI4 Forge.\n";
