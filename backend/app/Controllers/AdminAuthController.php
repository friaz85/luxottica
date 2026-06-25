<?php

namespace App\Controllers;

use App\Models\AdminUserModel;
use CodeIgniter\RESTful\ResourceController;
use Firebase\JWT\JWT;

class AdminAuthController extends ResourceController
{
    protected $modelName = 'App\Models\AdminUserModel';
    protected $format = 'json';
    private string $key;

    public function __construct()
    {
        $this->key = env('JWT_SECRET', 'CHANGE_ME_IN_ENV');
    }

    public function login()
    {
        $rules = [
            'username' => 'required',
            'password' => 'required'
        ];

        if (!$this->validate($rules)) {
            log_message('error', 'Login validation failed: ' . json_encode($this->validator->getErrors()));
            return $this->fail($this->validator->getErrors());
        }

        $username = $this->request->getVar('username');
        $password = $this->request->getVar('password');

        log_message('debug', 'Admin login attempt for user: ' . $username);

        $adminModel = new AdminUserModel();
        $admin      = $adminModel->where('username', $username)->first();

        if (!$admin || !password_verify($password, $admin['password_hash'])) {
            return $this->failUnauthorized('Credenciales inválidas');
        }

        $payload = [
            'iss'      => 'EmbajadoresTEC',
            'aud'      => 'EmbajadoresTEC',
            'iat'      => time(),
            'nbf'      => time(),
            'exp'      => time() + (60 * 60 * 24), // 24 hours
            'id'       => $admin['id'],
            'username' => $admin['username'],
            'email'    => $admin['email'],
            'role'     => $admin['role'] ?? 'quantum'
        ];

        $token = JWT::encode($payload, $this->key, 'HS256');

        return $this->respond([
            'status'  => 'success',
            'message' => 'Login exitoso',
            'token'   => $token,
            'user'    => [
                'id'       => $admin['id'],
                'username' => $admin['username'],
                'email'    => $admin['email'],
                'role'     => $admin['role'] ?? 'quantum'
            ]
        ]);
    }
}
