<?php

namespace App\Models;

use CodeIgniter\Model;

class SecurityLogModel extends Model
{
    protected $table = 'security_logs';
    protected $primaryKey = 'id';
    protected $useTimestamps = true;
    protected $createdField = 'last_attempt';
    protected $updatedField = ''; // No updated_at needed for logs usually, or empty if not exists
    protected $dateFormat = 'datetime';
    protected $allowedFields = ['ip_address', 'user_id', 'action', 'details', 'last_attempt'];
}
