<?php

namespace App\Models;

use CodeIgniter\Model;

class UserUploadLogModel extends Model
{
    protected $table = 'user_upload_logs';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'filename',
        'id_proyecto',
        'success_count',
        'duplicate_count',
        'created_at'
    ];
    protected $useTimestamps = false;
}
