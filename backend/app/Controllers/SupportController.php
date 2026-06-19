<?php

namespace App\Controllers;

use App\Models\SupportModel;
use App\Models\UserModel;
use CodeIgniter\RESTful\ResourceController;

class SupportController extends ResourceController
{
    public function createTicket()
    {
        $userId  = $this->request->user->id; // From JWT Filter
        $subject = $this->request->getVar('subject');
        $message = $this->request->getVar('message');

        $supportModel = new SupportModel();

        $supportModel->save([
            'user_id' => $userId,
            'subject' => $subject,
            'message' => $message,
            'status'  => 'open'
        ]);

        return $this->respondCreated(['message' => 'Ticket creado exitosamente. Pronto nos comunicaremos contigo.']);
    }

    public function getUserTickets()
    {
        $userId       = $this->request->user->id;
        $supportModel = new SupportModel();
        $tickets      = $supportModel->where('user_id', $userId)->orderBy('created_at', 'DESC')->findAll();

        return $this->respond($tickets);
    }

    public function adminGetTickets()
    {
        // Admin only
        $supportModel = new SupportModel();
        $db           = \Config\Database::connect();
        $query        = $db->table('tickets t')
            ->select('t.*, u.full_name, u.email')
            ->join('users u', 'u.id = t.user_id')
            ->orderBy('t.created_at', 'DESC')
            ->get();

        return $this->respond($query->getResult());
    }

    public function adminReply($id)
    {
        // Admin only
        $reply        = $this->request->getVar('reply');
        $supportModel = new SupportModel();

        $ticket = $supportModel->find($id);
        if (!$ticket)
            return $this->failNotFound('Ticket no encontrado.');

        $supportModel->update($id, [
            'admin_reply' => $reply,
            'status'      => 'closed'
        ]);

        return $this->respond(['message' => 'Respuesta enviada y ticket cerrado.']);
    }
}
