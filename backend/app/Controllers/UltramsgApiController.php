<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use App\Models\UserModel;
use App\Models\SupportTicketModel;

class UltramsgApiController extends ResourceController
{
    protected $format = 'json';

    /**
     * POST: Get user by email
     * Endpoint: /api/ultramsg/get-user
     * Body: { "email": "user@example.com" }
     * Response: { "error": 0, "user": {...} } or { "error": 1, "message": "..." }
     */
    public function getUser()
    {
        $data = $this->request->getJSON(true);

        if (!isset($data['email']) || empty($data['email'])) {
            return $this->respond([
                'error'     => 1,
                'idUsuario' => 0,
                'message'   => 'Email es requerido'
            ]);
        }

        $email     = $data['email'];
        $userModel = new UserModel();

        $user = $userModel->where('email', $email)->first();

        if (!$user) {
            return $this->respond([
                'error'     => 1,
                'idUsuario' => 0,
                'message'   => 'Usuario no encontrado'
            ]);
        }

        // Remove sensitive data
        unset($user['password']);

        return $this->respond([
            'error'     => 0,
            'idUsuario' => (int) $user['id'],
            'message'   => 'OK'
        ]);
    }

    /**
     * POST: Create support ticket
     * Endpoint: /api/ultramsg/create-ticket
     * Body: {
     *   "email": "user@example.com",
     *   "name": "User Name",
     *   "phone": "1234567890",
     *   "subject": "Ticket subject",
     *   "message": "Ticket message"
     * }
     * Response: { "error": 0, "ticket_number": "TKS2602100001" } or { "error": 1, "message": "..." }
     */
    public function createTicket()
    {
        $data = $this->request->getJSON(true);

        // Validate required fields
        $requiredFields = ['idUsuario', 'message'];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || empty($data[$field])) {
                return $this->respond([
                    'error'   => 1,
                    'message' => "Campo '{$field}' es requerido"
                ]);
            }
        }

        $userModel   = new UserModel();
        $ticketModel = new SupportTicketModel();

        // Check if user exists
        $user = $userModel->find($data['idUsuario']);

        if (!$user) {
            return $this->respond([
                'error'   => 1,
                'message' => 'Usuario no encontrado'
            ]);
        }

        // Generate ticket number
        $ticketNumber = $ticketModel->generateTicketNumber();

        // Prepare ticket data
        $ticketData = [
            'ticket_number' => $ticketNumber,
            'user_id'       => $user['id'],
            'user_email'    => $user['email'],
            'user_name'     => $user['full_name'],
            'user_phone'    => $user['phone'],
            'subject'       => 'Ticket desde WhatsApp',
            'category'      => $data['category'] ?? 'general',
            'message'       => $data['message'],
            'status'        => 'open',
            'priority'      => 'medium'
        ];

        // Create ticket
        try {
            $ticketModel->insert($ticketData);

            // Log the ticket creation
            log_message('info', "Support ticket created via Ultramsg API: {$ticketNumber} for {$user['email']}");

            return $this->respond([
                'error'         => 0,
                'ticket_number' => $ticketNumber
            ]);
        } catch (\Exception $e) {
            log_message('error', 'Error creating support ticket: ' . $e->getMessage());

            return $this->respond([
                'error'   => 1,
                'message' => 'Error al crear el ticket: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * POST: Add response to ticket
     * Endpoint: /api/ultramsg/add-response
     * Body: {
     *   "ticket_number": "TKS2602100001",
     *   "message": "Response message",
     *   "is_admin": 0
     * }
     */
    public function addResponse()
    {
        $data = $this->request->getJSON(true);

        if (!isset($data['ticket_number']) || !isset($data['message'])) {
            return $this->respond([
                'error'   => 1,
                'message' => 'Ticket number y mensaje son requeridos'
            ]);
        }

        $ticketModel = new SupportTicketModel();
        $ticket      = $ticketModel->where('ticket_number', $data['ticket_number'])->first();

        if (!$ticket) {
            return $this->respond([
                'error'   => 1,
                'message' => 'Ticket no encontrado'
            ]);
        }

        $responseModel = new \App\Models\SupportTicketResponseModel();
        $responseData  = [
            'ticket_id' => $ticket['id'],
            'message'   => $data['message'],
            'is_admin'  => $data['is_admin'] ?? 0
        ];

        try {
            $responseModel->insert($responseData);

            return $this->respond([
                'error'   => 0,
                'message' => 'Respuesta agregada exitosamente'
            ]);
        } catch (\Exception $e) {
            return $this->respond([
                'error'   => 1,
                'message' => 'Error al agregar respuesta: ' . $e->getMessage()
            ], 500);
        }
    }
}
