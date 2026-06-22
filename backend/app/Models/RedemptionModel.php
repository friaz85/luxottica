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
        'nombre_monedero',
        'apellido_paterno',
        'apellido_materno',
        'telefono_recarga',
        'id_telefonia',
        'status_recarga',
    ];
    protected $useTimestamps = true;
    protected $updatedField = '';
}
