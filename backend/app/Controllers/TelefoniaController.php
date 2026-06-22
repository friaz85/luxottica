<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;

class TelefoniaController extends ResourceController
{
    protected $db;

    public function __construct()
    {
        $this->db = \Config\Database::connect();
    }

    /** Public: returns active telefonias (used in redeem screen) */
    public function index()
    {
        $rows = $this->db->table('tblTelefonia')
            ->where('active', 1)
            ->orderBy('nombre', 'ASC')
            ->get()
            ->getResultArray();

        return $this->response->setJSON($rows);
    }

    /** Admin: returns all telefonias */
    public function adminIndex()
    {
        $rows = $this->db->table('tblTelefonia')
            ->orderBy('nombre', 'ASC')
            ->get()
            ->getResultArray();

        return $this->response->setJSON($rows);
    }

    public function create()
    {
        $nombre = trim($this->request->getPost('nombre') ?? '');
        if (empty($nombre)) {
            return $this->response->setStatusCode(400)->setJSON(['message' => 'Nombre requerido']);
        }
        $this->db->table('tblTelefonia')->insert(['nombre' => $nombre, 'active' => 1]);
        return $this->response->setJSON(['id' => $this->db->insertID(), 'nombre' => $nombre]);
    }

    public function delete($id = null)
    {
        $this->db->table('tblTelefonia')->where('id', $id)->delete();
        return $this->response->setJSON(['success' => true]);
    }
}
