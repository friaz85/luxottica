<?php

namespace App\Models;

use CodeIgniter\Model;

class VigenciaModel extends Model
{
    protected $table = 'vigencias';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'fecha_inicio',
        'fecha_fin'
    ];
    protected $useTimestamps = true;
    protected $createdField  = 'created_at';
    protected $updatedField  = 'updated_at';
}
