<?php

namespace App\Models;

use CodeIgniter\Model;

class EntryCodeModel extends Model
{
    protected $table = 'tblCodigoEntrada';
    protected $primaryKey = 'id';
    protected $allowedFields = ['id_proyecto', 'id_recompensa', 'codigo', 'puntos', 'is_used', 'used_by', 'used_at'];
}
