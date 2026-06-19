<?php

namespace App\Models;

use CodeIgniter\Model;

class EmailCampaignLogModel extends Model
{
    protected $table            = 'email_campaign_logs';
    protected $primaryKey       = 'id';
    protected $useAutoIncrement = true;
    protected $returnType       = 'array';
    protected $useSoftDeletes   = false;
    protected $protectFields    = true;
    protected $allowedFields    = ['user_id', 'email', 'campaign_type', 'sent_at'];

    protected $useTimestamps = false;
}
