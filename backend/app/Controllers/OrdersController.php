<?php

namespace App\Controllers;

use App\Models\RewardModel;
use App\Models\RedemptionModel;
use App\Models\UserModel;
use App\Models\RewardCodeModel;
use CodeIgniter\RESTful\ResourceController;

class OrdersController extends ResourceController
{
    public function checkoutReward()
    {
        $rewardId = $this->request->getVar('reward_id');
        $userId   = $this->request->user->id;

        $rewardModel     = new RewardModel();
        $userModel       = new UserModel();
        $redemptionModel = new RedemptionModel();
        $rewardCodeModel = new RewardCodeModel();
        $email           = \Config\Services::email();

        $reward = $rewardModel->find($rewardId);
        $user   = $userModel->find($userId);

        if (!$reward || $reward['stock'] <= 0) {
            return $this->fail('Recompensa no disponible o sin stock.');
        }

        if ($user['points'] < $reward['cost']) {
            return $this->fail('Puntos insuficientes.');
        }

        $db = \Config\Database::connect();
        $db->transStart();

        // 1. Deduct points and stock
        $userModel->update($userId, ['points' => $user['points'] - $reward['cost']]);
        $rewardModel->update($rewardId, ['stock' => $reward['stock'] - 1]);

        // 2. Fetch a unique code if digital
        $assignedCode = null;
        if ($reward['type'] === 'digital') {
            $codeRecord = $rewardCodeModel->where('reward_id', $rewardId)
                ->where('is_used', false)
                ->first();
            if (!$codeRecord) {
                $db->transRollback();
                return $this->fail('No quedan códigos digitales disponibles para este premio.');
            }
            $assignedCode = $codeRecord['code'];
            $rewardCodeModel->update($codeRecord['id'], ['is_used' => true]);
        }

        // 3. Create redemption record
        $redemptionModel->save([
            'user_id'          => $userId,
            'reward_id'        => $rewardId,
            'status'           => ($reward['type'] === 'digital' ? 'completed' : 'pending'),
            'shipping_address' => $user['address'] . ', ' . $user['city'] . ', ' . $user['state'],
            'digital_code'     => $assignedCode
        ]);

        $redemptionId = $redemptionModel->insertID();

        $db->transComplete();

        if ($db->transStatus() === FALSE) {
            return $this->failServerError('Error en el checkout.');
        }

        // 4. Automated Emails
        $email->setTo($user['email']);
        $email->setFrom('promo@takis.com', 'Takis Promo Team');

        if ($reward['type'] === 'digital') {
            $email->setSubject('¡Tu código digital Takis ha llegado!');
            $email->setMessage("Hola {$user['full_name']},\n\nTu recompensa '{$reward['title']}' está lista.\nTu código es: $assignedCode\n\nPuedes descargar tu certificado en el portal.");
        } else {
            $email->setSubject('Confirmación de pedido Takis - ' . $reward['title']);
            $email->setMessage("Hola {$user['full_name']},\n\nHemos recibido tu pedido de '{$reward['title']}'.\nSe enviará pronto a tu domicilio registrado.");
        }

        $email->send();

        return $this->respond([
            'status'        => 'success',
            'message'       => 'Canje completado exitosamente.',
            'redemption_id' => $redemptionId
        ]);
    }

    public function downloadPdf($id)
    {
        $redemptionModel = new RedemptionModel();
        $rewardModel     = new RewardModel();

        $redemption = $redemptionModel->find($id);
        if (!$redemption || !$redemption['digital_code']) {
            return $this->failNotFound('Documento no disponible.');
        }

        $reward = $rewardModel->find($redemption['reward_id']);
        if (!$reward || !$reward['pdf_template']) {
            return $this->failNotFound('Plantilla no encontrada.');
        }

        $templatePath = WRITEPATH . 'uploads/templates/' . $reward['pdf_template'];
        $coords       = json_decode($reward['coordinates'], true);

        // PDF Generation Logic using FPDI
        // Note: We use a simplified implementation assuming FPDI is available via Composer
        try {
            // Require FPDI if not autoloaded
            // require_once(ROOTPATH . 'vendor/setasign/fpdi/src/autoload.php');

            $pdf       = new \setasign\Fpdi\Fpdi();
            $pageCount = $pdf->setSourceFile($templatePath);
            $tplIdx    = $pdf->importPage(1);
            $pdf->addPage();
            $pdf->useTemplate($tplIdx, 0, 0, 210, 297); // A4 dimensions

            $pdf->SetFont('Arial', 'B', $reward['font_size'] ?? 16);
            $pdf->SetTextColor(26, 11, 46); // Takis Deep Purple

            foreach ($coords as $coord) {
                // Convert pixels to mm (approx 0.264)
                $x = $coord['x'] * 0.264;
                $y = $coord['y'] * 0.264;
                $pdf->SetXY($x, $y);
                $pdf->Cell(0, 0, $redemption['digital_code']);
            }

            $pdf->Output('D', 'Recompensa_Takis.pdf');
            exit;
        } catch (\Exception $e) {
            return $this->failServerError('Error al generar el PDF: ' . $e->getMessage());
        }
    }

    public function updateStatus($id)
    {
        $status          = $this->request->getVar('status');
        $redemptionModel = new RedemptionModel();
        $userModel       = new UserModel();
        $email           = \Config\Services::email();

        $redemption = $redemptionModel->find($id);
        if (!$redemption)
            return $this->failNotFound();

        $redemptionModel->update($id, ['status' => $status]);

        $user = $userModel->find($redemption['user_id']);
        $email->setTo($user['email']);
        $email->setFrom('promo@takis.com', 'Takis Shipping');

        $subject = "Actualización de tu pedido Takis";
        $message = "Hola {$user['full_name']},\n\nEl estado de tu pedido #$id ha cambiado a: **" . strtoupper($status) . "**.";

        switch ($status) {
            case 'processing':
                $message .= "\nEstamos preparando tu premio para envío.";
                break;
            case 'shipped':
                $message .= "\n¡Tu premio ya va en camino!";
                break;
            case 'delivered':
                $message .= "\nConfirmamos que tu premio ha sido entregado. ¡Disfrútalo!";
                break;
        }

        $email->setSubject($subject);
        $email->setMessage($message);
        $email->send();

        return $this->respond(['status' => $status, 'message' => 'Estado actualizado y usuario notificado.']);
    }
}
