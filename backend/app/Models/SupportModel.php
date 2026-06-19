<?php

namespace App\Models;

use CodeIgniter\Model;

class SupportModel extends Model
{
    protected $table = 'tickets';
    protected $primaryKey = 'id';
    protected $allowedFields = ['user_id', 'subject', 'message', 'status', 'admin_reply'];
    protected $useTimestamps = true;
}
