<?php

namespace App\Controllers;

use App\Models\PromoCodeModel;
use App\Models\UserModel;
use CodeIgniter\RESTful\ResourceController;

class AdminPromoCodesController extends ResourceController
{
    public function index()
    {
        $db = \Config\Database::connect();
        
        // Query Params
        $status = $this->request->getVar('status') ?? 'used';
        $search = $this->request->getVar('search');
        $page   = intval($this->request->getVar('page') ?? 1);
        $limit  = intval($this->request->getVar('limit') ?? 50);
        $offset = ($page - 1) * $limit;

        // Base builder for data (join users)
        $builder = $db->table('tblCodigoEntrada pc');
        $builder->select('pc.*, u.full_name as user_name, u.email as user_email, p.Proyecto as project_name');
        $builder->join('users u', 'u.id = pc.used_by', 'left');
        $builder->join('tblProyecto p', 'p.idProyecto = pc.id_proyecto', 'left');

        // Simple builder for counting
        $countBuilder = $db->table('tblCodigoEntrada');

        // Apply Filters
        if ($status === 'available') {
            $builder->where('pc.is_used', 0);
            $countBuilder->where('is_used', 0);
        } elseif ($status === 'used') {
            $builder->where('pc.is_used', 1);
            $countBuilder->where('is_used', 1);
        }

        if (!empty($search)) {
            $builder->groupStart()
                ->like('pc.codigo', $search)
                ->orLike('u.full_name', $search)
                ->orLike('u.email', $search)
                ->groupEnd();
            
            $searchCountBuilder = clone $builder;
            $total = $searchCountBuilder->countAllResults(false);
        } else {
            $total = $countBuilder->countAllResults(false);
        }

        $builder->orderBy('pc.used_at', 'DESC');
        $builder->limit($limit, $offset);

        $codes = $builder->get()->getResult();

        return $this->respond([
            'data'            => $codes,
            'total'           => $total,
            'total_available' => ($status === 'available') ? $total : 0,
            'total_used'      => ($status === 'used') ? $total : 0,
            'page'            => $page,
            'limit'           => $limit
        ]);
    }

    public function generate()
    {
        $count  = $this->request->getVar('count');
        $points = $this->request->getVar('points') ?? 1;
        $prefix = $this->request->getVar('prefix') ?? 'TEC';
        $id_proyecto = $this->request->getVar('id_proyecto');

        if (!$count || $count < 1 || $count > 10000) {
            return $this->fail('Cantidad inválida (1-10000)');
        }

        if (!$id_proyecto) {
            return $this->fail('El ID del proyecto es requerido.');
        }

        $promoModel = new PromoCodeModel();
        $generated  = 0;

        for ($i = 0; $i < $count; $i++) {
            $code = $this->generateUniqueCode($prefix);

            $data = [
                'codigo'      => $code,
                'puntos'      => $points,
                'id_proyecto' => $id_proyecto,
                'is_used'     => 0
            ];

            if ($promoModel->save($data)) {
                $generated++;
            }
        }

        return $this->respond([
            'status'    => 'success',
            'generated' => $generated,
            'message'   => "$generated códigos generados"
        ]);
    }

    public function upload()
    {
        $file = $this->request->getFile('file');
        $id_proyecto = $this->request->getVar('id_proyecto');

        if (!$file || !$file->isValid()) {
            return $this->fail('Archivo inválido');
        }

        if (!$id_proyecto) {
            return $this->fail('El proyecto es requerido.');
        }

        if ($file->getExtension() !== 'csv') {
            return $this->fail('Solo se permiten archivos CSV');
        }

        $promoModel = new PromoCodeModel();
        $imported   = 0;
        $errors     = [];

        if (($handle = fopen($file->getTempName(), 'r')) !== FALSE) {
            // Skip header row
            $header = fgetcsv($handle);

            while (($row = fgetcsv($handle)) !== FALSE) {
                if (count($row) < 2)
                    continue;

                $code   = trim($row[0]);
                $points = intval($row[1]);

                if (empty($code))
                    continue;

                // Check if code already exists
                if ($promoModel->where('codigo', $code)->first()) {
                    $errors[] = "Código duplicado: $code";
                    continue;
                }

                $data = [
                    'codigo'      => $code,
                    'puntos'      => $points > 0 ? $points : 1,
                    'id_proyecto' => $id_proyecto,
                    'is_used'     => 0
                ];

                if ($promoModel->save($data)) {
                    $imported++;
                }
            }
            fclose($handle);
        }

        return $this->respond([
            'status'   => 'success',
            'imported' => $imported,
            'errors'   => $errors,
            'message'  => "$imported códigos importados"
        ]);
    }

    private function generateUniqueCode($prefix)
    {
        $promoModel = new PromoCodeModel();

        do {
            $part1 = strtoupper(substr(md5(uniqid()), 0, 3));
            $part2 = strtoupper(substr(md5(uniqid()), 0, 3));
            $code  = "$prefix-$part1-$part2";

            $exists = $promoModel->where('codigo', $code)->first();
        } while ($exists);

        return $code;
    }
}
