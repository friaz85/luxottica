<?php

namespace App\Models;

use CodeIgniter\Model;

class AdminActivityLogModel extends Model
{
    protected $table = 'admin_activity_logs';
    protected $primaryKey = 'id';
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = '';
    protected $dateFormat = 'datetime';
    protected $allowedFields = [
        'admin_id',
        'admin_username',
        'action',
        'details',
        'ip_address',
        'created_at'
    ];
}
