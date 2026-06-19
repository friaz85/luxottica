<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

class AuthFilter implements FilterInterface
{
    public function before(RequestInterface $request, $arguments = null)
    {
        $key        = 'kYiFLGycgRRp31CIOcwRASFw5e5JOqu6D/LKt+AaYlWMGAKlK/gYq9SlB1j9m2Bl/lqBs6l6fQaJat5riEtEPA==';
        $authHeader = $request->getServer('HTTP_AUTHORIZATION') ?? $request->getServer('REDIRECT_HTTP_AUTHORIZATION');

        if (!$authHeader && function_exists('apache_request_headers')) {
            $headers    = apache_request_headers();
            $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? null;
        }

        if (!$authHeader) {
            return Services::response()->setJSON(['message' => 'Token required'])->setStatusCode(401);
        }

        $token = preg_match('/Bearer\s(\S+)/', $authHeader, $matches) ? $matches[1] : $authHeader;

        try {
            // MANUAL BASE64 DECODE FOR COMPATIBILITY (If library fails)
            $parts = explode('.', $token);
            if (count($parts) !== 3)
                throw new \Exception("Invalid token format");

            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])));
            if (!$payload)
                throw new \Exception("Invalid payload");

            // Verify signature using standard hash_hmac to bypass library issues
            $header    = $parts[0];
            $data      = "$parts[0].$parts[1]";
            $signature = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[2]));

            $expectedSignature = hash_hmac('sha256', $data, $key, true);

            if (!hash_equals($signature, $expectedSignature)) {
                throw new \Exception("Invalid signature");
            }

            if (isset($payload->exp) && $payload->exp < time()) {
                throw new \Exception("Token expired");
            }

            $request->user = $payload;

            if (!isset($payload->role) || $payload->role !== 'system_admin') {
                $userModel = new \App\Models\UserModel();
                $user      = $userModel->find($payload->id ?? $payload->uid ?? 0);
                if (!$user) {
                    return Services::response()->setJSON(['message' => 'User not found'])->setStatusCode(401);
                }

                if (isset($user['is_blocked']) && (int) $user['is_blocked'] === 1) {
                    return Services::response()->setJSON([
                        'status'  => 'blocked',
                        'message' => 'Tu cuenta ha sido bloqueada. Contacta a soporte para mas informacion.',
                        'reason'  => $user['blocked_reason'] ?? 'Actividad sospechosa',
                        'blocked' => true
                    ])->setStatusCode(403);
                }

                // Project expiration check
                if (isset($user['id_proyecto'])) {
                    $proyectoModel = new \App\Models\ProyectoModel();
                    if (!$proyectoModel->isProjectActive($user['id_proyecto'])) {
                        return Services::response()->setJSON([
                            'status'  => 'expired',
                            'message' => 'La vigencia de su participación ha finalizado.',
                            'expired' => true
                        ])->setStatusCode(403);
                    }
                }

                $blockedDomains = [
                    'ostahie.com',
                    'hutudns.com',
                    'creteanu.com',
                    'netoiu.com',
                    'fentaoba.com',
                    'kaoing.com',
                    'bitoini.com',
                    'dolofan.com',
                    'pazuric.com',
                    'bultoc.com',
                    'esyline.com',
                    'seaswar.com',
                    'amiralty.com',
                    'alibto.com',
                    'rivken.com',
                    'boftm.com',
                    'barneu.com',
                    'cosxo.com',
                    'advarm.com',
                    'teszari.com',
                    'cslua.com',
                    'feriwor.com',
                    'daerdy.com'
                ];

                // Fetch dynamic domains from DB
                try {
                    $db        = \Config\Database::connect();
                    $dbDomains = $db->table('blocked_domains')->select('domain')->get()->getResultArray();
                    foreach ($dbDomains as $d) {
                        $blockedDomains[] = strtolower($d['domain']);
                    }
                } catch (\Throwable $e) {
                    log_message('error', 'AuthFilter Domain Error: ' . $e->getMessage());
                }

                if (!empty($user['email'])) {
                    $emailParts = explode('@', $user['email']);
                    if (count($emailParts) === 2) {
                        $domain = strtolower($emailParts[1]);
                        if (in_array($domain, $blockedDomains)) {
                            // Block user permanently if not already blocked
                            if (!isset($user['is_blocked']) || (int) $user['is_blocked'] === 0) {
                                $userModel->update($user['id'], [
                                    'is_blocked'     => 1,
                                    'blocked_reason' => 'Sistema Anti-Fraude: Dominio de correo en lista negra (' . $domain . ')',
                                    'blocked_at'     => date('Y-m-d H:i:s')
                                ]);
                            }
                            return Services::response()->setJSON([
                                'message' => 'Por el momento no podemos procesar la solicitud.',
                            ])->setStatusCode(403);
                        }
                    }
                }
            }

        } catch (\Exception $e) {
            return Services::response()->setJSON(['message' => 'Auth Error: ' . $e->getMessage()])->setStatusCode(401);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }
}
