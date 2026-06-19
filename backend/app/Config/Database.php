<?php

namespace Config;

use CodeIgniter\Database\Config;

/**
 * Database Configuration
 */
class Database extends Config
{
    /**
     * The directory that holds the Migrations
     * and Seeds directories.
     */
    public string $filesPath = APPPATH . 'Database' . DIRECTORY_SEPARATOR;

    /**
     * Lets you choose which connection group to
     * use if no other is specified.
     */
    public string $defaultGroup = 'default';

    /**
     * The default database connection.
     *
     * @var array<string, mixed>
     */
    public array $default = [
        'DSN'          => '',
        'hostname'     => 'localhost',
        'username'     => 'ughgtdncr7ro5',
        'password'     => 'mrL*1*P7ke&f',
        'database'     => 'db4ccgnbnclgjg',
        'DBDriver'     => 'MySQLi',
        'DBPrefix'     => '',
        'pConnect'     => false,
        'DBDebug'      => true,
        'charset'      => 'utf8',
        'DBCollat'     => 'utf8_general_ci',
        'swapPre'      => '',
        'encrypt'      => false,
        'compress'     => false,
        'strictOn'     => false,
        'failover'     => [],
        'port'         => 3306,
        'numberNative' => false,
    ];

    public function __construct()
    {
        parent::__construct();

        // Manual override for DEV server if env variables are set
        if ($envDriver = env('database.default.DBDriver')) {
            $this->default['DBDriver'] = $envDriver;
            $this->default['hostname'] = env('database.default.hostname') ?? 'localhost';
            $this->default['username'] = env('database.default.username') ?? '';
            $this->default['password'] = env('database.default.password') ?? '';
            $this->default['database'] = env('database.default.database') ?? '';
            $this->default['port']     = (int) (env('database.default.port') ?? 3306);
        }

        // Using defined() to safely check for ENVIRONMENT
        $env = defined('ENVIRONMENT') ? \ENVIRONMENT : 'production';
        if ($env === 'testing') {
            $this->defaultGroup = 'tests';
        }
    }

    /**
     * This database connection is used when
     * running PHPUnit database tests.
     *
     * @var array<string, mixed>
     */
    public array $tests = [
        'DSN'         => '',
        'hostname'    => '127.0.0.1',
        'username'    => '',
        'password'    => '',
        'database'    => ':memory:',
        'DBDriver'    => 'SQLite3',
        'DBPrefix'    => 'db_',
        'pConnect'    => false,
        'DBDebug'     => true,
        'charset'     => 'utf8',
        'DBCollat'    => 'utf8_general_ci',
        'swapPre'     => '',
        'encrypt'     => false,
        'compress'    => false,
        'strictOn'    => false,
        'failover'    => [],
        'port'        => 3306,
        'foreignKeys' => true,
        'busyTimeout' => 1000,
    ];
}
