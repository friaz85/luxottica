<?php

namespace App\Controllers;

use App\Models\ProyectoModel;
use CodeIgniter\RESTful\ResourceController;

class AdminProjectController extends ResourceController
{
    protected $modelName = 'App\Models\ProyectoModel';
    protected $format = 'json';

    public function index()
    {
        return $this->respond($this->model->findAll());
    }

    public function create()
    {
        $data = $this->request->getJSON(true) ?: $this->request->getPost();
        if ($this->model->save($data)) {
            return $this->respondCreated(['status' => 'success', 'message' => 'Proyecto creado']);
        }
        return $this->fail('Error al crear proyecto');
    }

    public function update($id = null)
    {
        $data = $this->request->getJSON(true) ?: $this->request->getRawInput();
        if ($this->model->update($id, $data)) {
            return $this->respond(['status' => 'success', 'message' => 'Proyecto actualizado']);
        }
        return $this->fail('Error al actualizar proyecto');
    }

    public function delete($id = null)
    {
        if ($this->model->delete($id)) {
            return $this->respondDeleted(['status' => 'success', 'message' => 'Proyecto eliminado']);
        }
        return $this->fail('Error al eliminar proyecto');
    }
}
