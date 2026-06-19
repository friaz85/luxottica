<?php

namespace App\Controllers;

use CodeIgniter\Controller;

class DebugController extends Controller
{
    public function index()
    {
        $db    = \Config\Database::connect();
        $query = $db->query("SELECT * FROM promo_codes");
        return $this->response->setJSON($query->getResultArray());
    }

    public function testStatus()
    {
        try {
            $instanceId = getenv('ULTRAMSG_INSTANCE_ID') ?: 'N/A';
            $token      = getenv('ULTRAMSG_TOKEN') ?: 'N/A';

            $classExists = class_exists('\UltraMsg\WhatsAppApi');

            if (!$classExists) {
                return $this->response->setJSON([
                    'status'  => 'class_missing',
                    'message' => 'La clase \UltraMsg\WhatsAppApi no fue encontrada.',
                ]);
            }

            if ($instanceId === 'N/A' || $token === 'N/A') {
                return $this->response->setJSON([
                    'status'    => 'config_missing',
                    'instance'  => $instanceId,
                    'token_set' => ($token !== 'N/A')
                ]);
            }

            $client = new \UltraMsg\WhatsAppApi($token, $instanceId);
            $phones = ['5215576100376', '5215564166398'];
            $res    = [];
            foreach ($phones as $phone) {
                $res[$phone] = $client->sendChatMessage($phone, 'Prueba ' . date('H:i:s'));
            }

            return $this->response->setJSON([
                'status'  => 'success',
                'message' => 'Client created. Sending messages...',
                'res'     => $res
            ]);
        } catch (\Throwable $e) {
            return $this->response->setJSON([
                'status' => 'error',
                'msg'    => $e->getMessage(),
                'line'   => $e->getLine()
            ])->setStatusCode(500);
        }
    }
}
