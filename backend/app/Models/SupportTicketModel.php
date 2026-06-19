<?php

namespace App\Models;

use CodeIgniter\Model;

class SupportTicketModel extends Model
{
    protected $table = 'support_tickets';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'ticket_number',
        'user_id',
        'user_email',
        'user_name',
        'user_phone',
        'subject',
        'category',
        'message',
        'status',
        'priority',
        'assigned_to',
        'admin_notes',
        'resolved_at'
    ];
    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    /**
     * Generate unique ticket number
     */
    public function generateTicketNumber()
    {
        $prefix    = 'TKS';
        $timestamp = date('ymd');
        $random    = str_pad(rand(0, 9999), 4, '0', STR_PAD_LEFT);

        $ticketNumber = $prefix . $timestamp . $random;

        // Verify uniqueness
        while ($this->where('ticket_number', $ticketNumber)->first()) {
            $random       = str_pad(rand(0, 9999), 4, '0', STR_PAD_LEFT);
            $ticketNumber = $prefix . $timestamp . $random;
        }

        return $ticketNumber;
    }

    /**
     * Get tickets with user info
     */
    public function getTicketsWithUserInfo($limit = null, $offset = null)
    {
        $builder = $this->select('support_tickets.*, users.full_name as registered_user_name')
            ->join('users', 'users.id = support_tickets.user_id', 'left')
            ->orderBy('support_tickets.created_at', 'DESC');

        if ($limit) {
            $builder->limit($limit, $offset);
        }

        return $builder->findAll();
    }
}
