<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use App\Models\RedemptionModel;
use App\Models\UserModel;
use App\Libraries\EmailSender;

class AdminOrdersController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $redemptionModel = new RedemptionModel();

        // Get all redemptions with user and reward info
        $redemptions = $redemptionModel
            ->select('redemptions.*, users.full_name as user_name, users.email as user_email, rewards.title as reward_title, rewards.cost as points_cost')
            ->join('users', 'users.id = redemptions.user_id')
            ->join('rewards', 'rewards.id = redemptions.reward_id')
            ->orderBy('redemptions.created_at', 'DESC')
            ->findAll();

        return $this->respond($redemptions);
    }

    public function updateOrder($id = null)
    {
        if (!$id) return $this->fail('ID de canje requerido');

        $redemptionModel = new RedemptionModel();
        $userModel       = new UserModel();
        $data            = $this->request->getJSON(true);

        $order = $redemptionModel->find($id);
        if (!$order) return $this->failNotFound('Canje no encontrado');

        $updateData = [];
        if (isset($data['status']))      $updateData['status']      = $data['status'];
        if (isset($data['admin_notes'])) $updateData['admin_notes'] = $data['admin_notes'];

        $redemptionModel->update($id, $updateData);

        // Notify user if status changed to delivered
        if (isset($data['status']) && $data['status'] === 'delivered' && $order['status'] !== 'delivered') {
            $user = $userModel->find($order['user_id']);
            $this->sendDeliveredEmail($user, $order);
        }

        return $this->respond(['status' => 'success', 'message' => 'Canje actualizado']);
    }

    private function sendDeliveredEmail($user, $order)
    {
        $subject = '¡Tu recompensa ha sido entregada!';
        $title   = '✅ RECOMPENSA ENTREGADA';
        $message = "Hola {$user['full_name']},<br><br>¡Felicidades! Tu recompensa del portal Embajadores TEC ha sido procesada y entregada.<br><br>Gracias por ser parte de nuestra comunidad.";

        EmailSender::sendEmail($user['email'], $subject, $title, $message);
    }
}
