<?php

namespace App\Controllers;

use App\Models\VigenciaModel;
use CodeIgniter\RESTful\ResourceController;

class AdminVigenciasController extends ResourceController
{
    public function index()
    {
        $model = new VigenciaModel();
        return $this->respond($model->orderBy('fecha_inicio', 'DESC')->findAll());
    }

    public function create()
    {
        $model = new VigenciaModel();
        $data = $this->request->getJSON(true) ?? $this->request->getPost();

        if (empty($data['fecha_inicio']) || empty($data['fecha_fin'])) {
            return $this->fail('La fecha de inicio y fin son obligatorias.');
        }

        $saveData = [
            'fecha_inicio' => $data['fecha_inicio'],
            'fecha_fin'    => $data['fecha_fin']
        ];

        try {
            if ($model->insert($saveData)) {
                $id = $model->insertID();
                return $this->respondCreated(['message' => 'Vigencia creada', 'id' => $id]);
            }
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }

        return $this->fail($model->errors());
    }

    public function update($id = null)
    {
        $model = new VigenciaModel();
        $data = $this->request->getJSON(true) ?? $this->request->getPost();

        if (empty($data['fecha_inicio']) || empty($data['fecha_fin'])) {
            return $this->fail('La fecha de inicio y fin son obligatorias.');
        }

        $updateData = [
            'fecha_inicio' => $data['fecha_inicio'],
            'fecha_fin'    => $data['fecha_fin']
        ];

        try {
            if ($model->update($id, $updateData)) {
                return $this->respond(['message' => 'Vigencia actualizada']);
            }
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }

        return $this->fail($model->errors());
    }

    public function delete($id = null)
    {
        $model = new VigenciaModel();
        try {
            if ($model->delete($id)) {
                return $this->respondDeleted(['message' => 'Vigencia eliminada']);
            }
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
        return $this->fail('Error al eliminar vigencia.');
    }
}
