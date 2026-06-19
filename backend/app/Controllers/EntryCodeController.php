<?php

namespace App\Controllers;

use App\Models\EntryCodeModel;
use App\Models\ProyectoModel;
use App\Models\UserModel;
use CodeIgniter\RESTful\ResourceController;

class EntryCodeController extends ResourceController
{
    public function redeem()
    {
        $codeValue = $this->request->getVar('code');
        $userId    = $this->request->user->id;

        if (empty($codeValue)) {
            return $this->fail('Código es requerido.', 400);
        }

        $codeModel     = new EntryCodeModel();
        $proyectoModel = new ProyectoModel();
        $userModel     = new UserModel();

        $user = $userModel->find($userId);
        if (!$user) {
            return $this->failNotFound('Usuario no encontrado.');
        }

        // 1. Check User's Project Validity
        if (isset($user['id_proyecto'])) {
            if (!$proyectoModel->isProjectActive($user['id_proyecto'])) {
                return $this->fail("La vigencia de su usuario ha finalizado.", 403);
            }
        }

        $entryCode = $codeModel->where('codigo', $codeValue)
                              ->groupStart()
                                ->where('id_usuario_asignado', $userId)
                                ->orWhere('id_usuario_asignado', null)
                              ->groupEnd()
                              ->first();

        if (!$entryCode) {
            return $this->fail('El código que ingresaste no es válido. Verifica que lo hayas escrito correctamente, sin espacios ni caracteres adicionales, e inténtalo de nuevo.', 404);
        }

        if ($entryCode['is_used']) {
            return $this->fail('Este código ya fue canjeado anteriormente.', 400);
        }

        // 2. Check Code's Project Validity
        if (isset($entryCode['id_proyecto'])) {
            if (!$proyectoModel->isProjectActive($entryCode['id_proyecto'])) {
                return $this->fail("La vigencia de su código ha finalizado.", 403);
            }
        }

        // Process Redemption
        $db = \Config\Database::connect();
        $db->transStart();

        $codeModel->update($entryCode['id'], [
            'is_used' => 1,
            'used_by' => $userId,
            'used_at' => date('Y-m-d H:i:s')
        ]);

        $newPoints = (int)$user['points'] + (int)$entryCode['puntos'];
        $userModel->update($userId, ['points' => $newPoints]);

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->fail('Error al procesar el código.');
        }

        return $this->respond([
            'status'  => 'success',
            'message' => '¡Código canjeado correctamente!',
            'points'  => $entryCode['puntos'],
            'total'   => $newPoints
        ]);
    }
}
