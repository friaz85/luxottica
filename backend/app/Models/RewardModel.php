<?php

namespace App\Models;

use CodeIgniter\Model;

class RewardModel extends Model
{
    protected $table = 'rewards';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'id_proyecto',
        'title',
        'description',
        'type',
        'tipo_recompensa',
        'cost',
        'stock',
        'active',
        'image_url',
        'pdf_template',
        'codes_count',
        'coordinates',
        'code_areas',
        'font_size',
        'idVigencia',
        'monto_recarga',
        'vigencia_area'
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}
