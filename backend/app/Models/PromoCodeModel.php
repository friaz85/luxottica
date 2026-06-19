<?php

namespace App\Models;

use CodeIgniter\Model;

class PromoCodeModel extends Model
{
    protected $table = 'tblCodigoEntrada';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'id_usuario_asignado', 
        'id_proyecto', 
        'codigo', 
        'puntos', 
        'id_recompensa', 
        'is_used', 
        'used_by', 
        'used_at', 
        'used_ip'
    ];
    protected $useTimestamps = false;
}
