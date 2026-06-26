<?php

namespace App\Models;

use CodeIgniter\Model;

class ProyectoModel extends Model
{
    protected $table = 'tblProyecto';
    protected $primaryKey = 'idProyecto';
    protected $allowedFields = ['Proyecto', 'Fecha_Inicio', 'Fecha_Fin', 'activo'];

    public function isProjectActive($id)
    {
        $project = $this->find($id);
        if (!$project) return false;

        // Check if project is deactivated
        if (isset($project['activo']) && (int)$project['activo'] === 0) {
            return false;
        }

        $today = date('Y-m-d');
        return ($today >= $project['Fecha_Inicio'] && $today <= $project['Fecha_Fin']);
    }
}
