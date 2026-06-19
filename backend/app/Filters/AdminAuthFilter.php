<?php

namespace App\Filters;

use CodeIgniter\Filters\FilterInterface;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Config\Services;

class AdminAuthFilter implements FilterInterface
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
            return Services::response()->setJSON(['status' => 401, 'message' => 'Admin token required'])->setStatusCode(401);
        }

        $token = preg_match('/Bearer\s(\S+)/', $authHeader, $matches) ? $matches[1] : $authHeader;

        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3)
                throw new \Exception("Invalid token format");

            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[1])));
            if (!$payload)
                throw new \Exception("Invalid payload");

            $data              = "$parts[0].$parts[1]";
            $signature         = base64_decode(str_replace(['-', '_'], ['+', '/'], $parts[2]));
            $expectedSignature = hash_hmac('sha256', $data, $key, true);

            if (!hash_equals($signature, $expectedSignature)) {
                throw new \Exception("Invalid signature");
            }

            if (isset($payload->exp) && $payload->exp < time()) {
                throw new \Exception("Token expired");
            }

            // RBAC
            $role = $payload->role ?? null;

            if ($role === 'takis') {
                $uri      = $request->getUri()->getPath();
                $username = $payload->username ?? null;

                // Strict limitations for 'takis' role: Only Dashboard and Analytics.
                // No access to Orders, Support, Users, or Settings.
                $isAllowed = (
                    strpos($uri, 'admin/stats') !== false ||
                    strpos($uri, 'admin/dashboard') !== false ||
                    strpos($uri, 'admin/redemptions') !== false ||
                    strpos($uri, 'analytics/stats') !== false
                );

                if (!$isAllowed) {
                    return Services::response()->setJSON([
                        'status'  => 403,
                        'message' => 'Acceso restringido: El rol "' . $role . '" solo tiene permiso para el Dashboard.'
                    ])->setStatusCode(403);
                }
            } else if ($role !== 'admin' && $role !== 'system_admin') {
                return Services::response()->setJSON([
                    'status'  => 403,
                    'message' => 'Se requiere rol administrativo (Admin o System Admin). Rol actual: ' . ($role ?? 'invitado')
                ])->setStatusCode(403);
            }

            $request->admin_user = $payload;

        } catch (\Exception $e) {
            return Services::response()->setJSON(['status' => 401, 'message' => 'Admin Auth Error: ' . $e->getMessage()])->setStatusCode(401);
        }
    }

    public function after(RequestInterface $request, ResponseInterface $response, $arguments = null)
    {
    }
}
