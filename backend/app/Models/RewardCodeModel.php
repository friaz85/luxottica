<?php

namespace App\Models;

use CodeIgniter\Model;

class RewardCodeModel extends Model
{
    protected $table = 'reward_codes';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'reward_id',
        'id_vigencia',
        'code',
        'code1',
        'code2',
        'code3',
        'code4',
        'code5',
        'code6',
        'code7',
        'code8',
        'is_used'
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}
