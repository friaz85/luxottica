<?php

namespace App\Models;

use CodeIgniter\Model;

class RedemptionModel extends Model
{
    protected $table = 'redemptions';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'user_id',
        'reward_id',
        'status',
        'digital_code',
        'pdf_path',
        'extra_data',
    ];
    protected $useTimestamps = true;
    protected $updatedField = '';
}
