<?php

namespace App\Models;

use CodeIgniter\Model;

class SupportTicketResponseModel extends Model
{
    protected $table = 'support_ticket_responses';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'ticket_id',
        'user_id',
        'is_admin',
        'message'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = '';
}
