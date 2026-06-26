<?php

namespace App\Controllers;

use App\Models\ProyectoModel;
use CodeIgniter\RESTful\ResourceController;

class AdminProjectController extends ResourceController
{
    protected $modelName = 'App\Models\ProyectoModel';
    protected $format = 'json';

    private function logActivity($action, $details)
    {
        $logModel = new \App\Models\AdminActivityLogModel();
        $logModel->save([
            'admin_id'       => $this->request->admin_user->id ?? null,
            'admin_username' => $this->request->admin_user->username ?? 'admin',
            'action'         => $action,
            'details'        => $details,
            'ip_address'     => $this->request->getIPAddress()
        ]);
    }

    public function index()
    {
        return $this->respond($this->model->findAll());
    }

    public function create()
    {
        $data = $this->request->getJSON(true) ?: $this->request->getPost();
        if ($this->model->save($data)) {
            $this->logActivity('create_project', "Creado proyecto: {$data['Proyecto']}");
            return $this->respondCreated(['status' => 'success', 'message' => 'Proyecto creado']);
        }
        return $this->fail('Error al crear proyecto');
    }

    public function update($id = null)
    {
        $data = $this->request->getJSON(true) ?: $this->request->getRawInput();
        $projectBefore = $this->model->find($id);
        if ($this->model->update($id, $data)) {
            $name = $data['Proyecto'] ?? ($projectBefore['Proyecto'] ?? 'ID ' . $id);
            $this->logActivity('update_project', "Actualizado proyecto: {$name} (ID: {$id})");
            return $this->respond(['status' => 'success', 'message' => 'Proyecto actualizado']);
        }
        return $this->fail('Error al actualizar proyecto');
    }

    public function delete($id = null)
    {
        $project = $this->model->find($id);
        if (!$project) {
            return $this->failNotFound('Proyecto no encontrado');
        }

        if ($this->model->update($id, ['activo' => 0])) {
            $this->logActivity('deactivate_project', "Desactivado proyecto: {$project['Proyecto']} (ID: {$id})");
            return $this->respond(['status' => 'success', 'message' => 'Proyecto desactivado']);
        }
        return $this->fail('Error al desactivar proyecto');
    }
}
