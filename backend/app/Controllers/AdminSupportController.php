<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use App\Models\SupportTicketModel;
use App\Models\SupportTicketResponseModel;

class AdminSupportController extends ResourceController
{
    protected $format = 'json';

    /**
     * Get all support tickets
     */
    public function index()
    {
        $ticketModel = new SupportTicketModel();
        $tickets     = $ticketModel->getTicketsWithUserInfo();

        return $this->respond($tickets);
    }

    /**
     * Get single ticket with responses
     */
    public function getTicket($id = null)
    {
        if (!$id) {
            return $this->fail('ID de ticket requerido');
        }

        $ticketModel   = new SupportTicketModel();
        $responseModel = new SupportTicketResponseModel();

        $ticket = $ticketModel->find($id);

        if (!$ticket) {
            return $this->failNotFound('Ticket no encontrado');
        }

        // Get responses
        $responses = $responseModel
            ->select('support_ticket_responses.*, users.full_name as user_name')
            ->join('users', 'users.id = support_ticket_responses.user_id', 'left')
            ->where('ticket_id', $id)
            ->orderBy('created_at', 'ASC')
            ->findAll();

        $ticket['responses'] = $responses;

        return $this->respond($ticket);
    }

    /**
     * Update ticket status
     */
    public function updateTicket($id = null)
    {
        if (!$id) {
            return $this->fail('ID de ticket requerido');
        }

        $ticketModel = new SupportTicketModel();
        $data        = $this->request->getJSON(true);

        $updateData = [];
        if (isset($data['status']))
            $updateData['status'] = $data['status'];
        if (isset($data['category']))
            $updateData['category'] = $data['category'];
        if (isset($data['priority']))
            $updateData['priority'] = $data['priority'];
        if (isset($data['admin_notes']))
            $updateData['admin_notes'] = $data['admin_notes'];
        if (isset($data['assigned_to']))
            $updateData['assigned_to'] = $data['assigned_to'];

        // If status is resolved or closed, set resolved_at
        if (isset($data['status']) && in_array($data['status'], ['resolved', 'closed'])) {
            $updateData['resolved_at'] = date('Y-m-d H:i:s');
        }

        $ticketModel->update($id, $updateData);

        return $this->respond([
            'status'  => 'success',
            'message' => 'Ticket actualizado correctamente'
        ]);
    }

    /**
     * Add response to ticket
     */
    public function addResponse($id = null)
    {
        if (!$id) {
            return $this->fail('ID de ticket requerido');
        }

        $responseModel = new SupportTicketResponseModel();
        $data          = $this->request->getJSON(true);

        if (!isset($data['message'])) {
            return $this->fail('Mensaje es requerido');
        }

        $responseData = [
            'ticket_id' => $id,
            'message'   => $data['message'],
            'is_admin'  => 1 // Admin response
        ];

        $responseModel->insert($responseData);

        // Update ticket status to in_progress if it was open
        $ticketModel = new SupportTicketModel();
        $ticket      = $ticketModel->find($id);
        if ($ticket && $ticket['status'] === 'open') {
            $ticketModel->update($id, ['status' => 'in_progress']);
        }

        return $this->respond([
            'status'  => 'success',
            'message' => 'Respuesta agregada correctamente'
        ]);
    }

    /**
     * Get ticket statistics
     */
    public function getStats()
    {
        $ticketModel = new SupportTicketModel();

        $stats = [
            'total'       => $ticketModel->countAllResults(),
            'open'        => $ticketModel->where('status', 'open')->countAllResults(),
            'in_progress' => $ticketModel->where('status', 'in_progress')->countAllResults(),
            'resolved'    => $ticketModel->where('status', 'resolved')->countAllResults(),
            'closed'      => $ticketModel->where('status', 'closed')->countAllResults()
        ];

        return $this->respond($stats);
    }
}
