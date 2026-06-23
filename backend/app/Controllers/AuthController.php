<?php

namespace App\Controllers;

use App\Models\UserModel;
use App\Models\SecurityLogModel;
use App\Models\ProyectoModel;
use CodeIgniter\RESTful\ResourceController;
use Firebase\JWT\JWT;

class AuthController extends ResourceController
{
    protected $modelName = 'App\Models\UserModel';
    protected $format = 'json';
    private $key = 'kYiFLGycgRRp31CIOcwRASFw5e5JOqu6D/LKt+AaYlWMGAKlK/gYq9SlB1j9m2Bl/lqBs6l6fQaJat5riEtEPA==';

    public function login()
    {
        $email    = $this->request->getVar('email');
        $password = $this->request->getVar('password');
        $ip       = $this->request->getIPAddress();
        $logModel = new SecurityLogModel();

        if (empty($email) || empty($password)) {
            return $this->fail('Email y contraseña son requeridos.', 400);
        }

        $user = $this->model->where('email', $email)->first();

        if (!$user) {
            return $this->failNotFound('Usuario no encontrado.');
        }

        // Check Project Validity
        if (isset($user['id_proyecto'])) {
            $proyectoModel = new ProyectoModel();
            if (!$proyectoModel->isProjectActive($user['id_proyecto'])) {
                return $this->fail("La vigencia de su usuario ha finalizado.", 403);
            }
        }

        if (isset($user['is_blocked']) && (int) $user['is_blocked'] === 1) {
            return $this->fail("Cuenta restringida, favor de comunicarse al servicio al cliente", 403);
        }

        if (!password_verify($password, $user['password_hash'])) {
            $logModel->save([
                'ip_address' => $ip,
                'user_id'    => $user['id'],
                'action'     => 'login_failed',
                'details'    => 'Invalid Password'
            ]);
            return $this->fail('Contraseña incorrecta.', 401);
        }

        $logModel->save([
            'ip_address' => $ip,
            'user_id'    => $user['id'],
            'action'     => 'login_success',
            'details'    => 'Password Verified'
        ]);

        $payload = [
            'iat'         => time(),
            'exp'         => time() + (60 * 60 * 24 * 30),
            'id'          => $user['id'],
            'email'       => $user['email'],
            'id_proyecto' => $user['id_proyecto'] ?? null
        ];

        $token = JWT::encode($payload, $this->key, 'HS256');

        return $this->respond([
            'status'  => 'success',
            'message' => 'Login exitoso.',
            'token'   => $token,
            'user'    => [
                'id'      => $user['id'],
                'name'    => $user['full_name'],
                'email'   => $user['email'],
                'points'  => $user['points'],
                'role'    => $user['role'] ?? 'user',
                'has_pin' => !empty($user['pin'])
            ]
        ]);
    }

    public function register()
    {
        return $this->fail('Registro público deshabilitado.', 403);
    }
}
