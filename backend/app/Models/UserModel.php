<?php

namespace App\Models;

use CodeIgniter\Model;

class UserModel extends Model
{
    protected $table = 'users';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'id_proyecto',
        'email',
        'password_hash',
        'full_name',
        'phone',
        'role',
        'points',
        'points_used',
        'points_remaining',
        'is_blocked',
        'blocked_reason',
        'blocked_at',
        'created_at',
        'updated_at'
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}
