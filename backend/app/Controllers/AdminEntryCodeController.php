<?php

namespace App\Controllers;

use App\Models\EntryCodeModel;
use App\Models\ProyectoModel;
use App\Models\RewardModel;
use CodeIgniter\RESTful\ResourceController;

class AdminEntryCodeController extends ResourceController
{
    protected $modelName = 'App\Models\EntryCodeModel';
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();
        $builder = $db->table('tblCodigoEntrada');
        $builder->select('tblCodigoEntrada.*, tblProyecto.Proyecto as project_name, rewards.title as reward_name, users.full_name as used_by_name');
        $builder->join('tblProyecto', 'tblProyecto.idProyecto = tblCodigoEntrada.id_proyecto', 'left');
        $builder->join('rewards', 'rewards.id = tblCodigoEntrada.id_recompensa', 'left');
        $builder->join('users', 'users.id = tblCodigoEntrada.used_by', 'left');
        
        $search = $this->request->getGet('search');
        if ($search) {
            $builder->like('codigo', $search);
        }

        $builder->orderBy('created_at', 'DESC');
        
        $page = $this->request->getGet('page') ?: 1;
        $limit = $this->request->getGet('limit') ?: 50;
        $offset = ($page - 1) * $limit;

        $total = $builder->countAllResults(false);
        $data = $builder->get($limit, $offset)->getResultArray();

        return $this->respond([
            'data' => $data,
            'total' => $total,
            'page' => (int)$page,
            'limit' => (int)$limit
        ]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $data = $this->request->getJSON(true);
        $code = $data['codigo'] ?? null;
        
        if ($code) {
            $existsInEntry = $db->table('tblCodigoEntrada')->where('codigo', $code)->countAllResults() > 0;
            $existsInReward = $db->table('reward_codes')
                                 ->groupStart()
                                    ->where('code', $code)->orWhere('code1', $code)->orWhere('code2', $code)
                                    ->orWhere('code3', $code)->orWhere('code4', $code)->orWhere('code5', $code)
                                    ->orWhere('code6', $code)->orWhere('code7', $code)->orWhere('code8', $code)
                                 ->groupEnd()
                                 ->countAllResults() > 0;
            
            if ($existsInEntry || $existsInReward) {
                return $this->fail('El código ya existe en el sistema (entrada o salida).');
            }
        }

        if ($this->model->save($data)) {
            return $this->respondCreated(['status' => 'success', 'message' => 'Código creado']);
        }
        return $this->fail($this->model->errors());
    }

    public function import()
    {
        $data = $this->request->getJSON(true);
        $codes = $data['codes'] ?? [];
        $id_proyecto = $data['id_proyecto'] ?? null;
        $id_recompensa = $data['id_recompensa'] ?? null;
        $puntos = $data['puntos'] ?? 0;

        if (empty($codes)) return $this->fail('No hay códigos para importar');
        if (!$id_proyecto) return $this->fail('Proyecto es requerido');

        $successCount = 0;
        $duplicates = [];
        $errors = [];

        foreach ($codes as $code) {
            $code = trim($code);
            if (empty($code)) continue;

            $insertData = [
                'id_proyecto' => $id_proyecto,
                'id_recompensa' => $id_recompensa,
                'codigo' => $code,
                'puntos' => $puntos
            ];

            // Global uniqueness check
            $existsInEntry = $db->table('tblCodigoEntrada')->where('codigo', $code)->countAllResults() > 0;
            $existsInReward = $db->table('reward_codes')
                                 ->groupStart()
                                    ->where('code', $code)->orWhere('code1', $code)->orWhere('code2', $code)
                                    ->orWhere('code3', $code)->orWhere('code4', $code)->orWhere('code5', $code)
                                    ->orWhere('code6', $code)->orWhere('code7', $code)->orWhere('code8', $code)
                                 ->groupEnd()
                                 ->countAllResults() > 0;

            if ($existsInEntry || $existsInReward) {
                $duplicates[] = $code;
                continue;
            }

            try {
                if ($this->model->insert($insertData)) {
                    $successCount++;
                } else {
                    $errors[] = $code;
                }
            } catch (\Exception $e) {
                $errors[] = $code;
            }
        }

        return $this->respond([
            'status' => 'success',
            'message' => "Proceso finalizado.",
            'success_count' => $successCount,
            'duplicate_count' => count($duplicates),
            'duplicates' => $duplicates,
            'error_count' => count($errors),
            'errors_list' => $errors
        ]);
    }

    public function usageReport()
    {
        $db = \Config\Database::connect();
        $builder = $db->table('tblCodigoEntrada');
        $builder->select('
            tblCodigoEntrada.id,
            tblCodigoEntrada.codigo,
            tblCodigoEntrada.puntos,
            tblCodigoEntrada.used_at,
            tblCodigoEntrada.is_used as status,
            COALESCE(u_used.email, u_assigned.email) as user_email,
            tblProyecto.Proyecto as project_name
        ');
        $builder->join('users u_used', 'u_used.id = tblCodigoEntrada.used_by', 'left');
        $builder->join('users u_assigned', 'u_assigned.id = tblCodigoEntrada.id_usuario_asignado', 'left');
        $builder->join('tblProyecto', 'tblProyecto.idProyecto = tblCodigoEntrada.id_proyecto', 'left');

        $builder->orderBy('tblCodigoEntrada.used_at', 'DESC');

        $data = $builder->get()->getResultArray();
        return $this->respond($data);
    }
}
