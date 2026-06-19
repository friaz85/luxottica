<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use App\Models\UserModel;
use App\Models\SecurityLogModel;

class AdminUserController extends ResourceController
{
    protected $format = 'json';

    /**
     * Get all users
     */
    public function index()
    {
        $userModel = new UserModel();
        $users     = $userModel->findAll();
        $db        = \Config\Database::connect();

        foreach ($users as &$user) {
            unset($user['password_hash']);
            $user['is_blocked'] = (int) ($user['is_blocked'] ?? 0);

            // Get Project Name
            if (isset($user['id_proyecto'])) {
                $p = $db->table('tblProyecto')->where('idProyecto', $user['id_proyecto'])->get()->getRow();
                $user['project_name'] = $p ? $p->Proyecto : 'N/A';
            } else {
                $user['project_name'] = 'N/A';
            }

            // Calculate Points Stats
            $redeemedQuery = $db->query("
                SELECT SUM(r.cost) as total 
                FROM redemptions re 
                JOIN rewards r ON r.id = re.reward_id 
                WHERE re.user_id = ?
            ", [$user['id']]);
            $spent         = (int) ($redeemedQuery->getRow()->total ?? 0);

            $current = (int) ($user['points'] ?? 0);
            $earned = $current + $spent;

            // Get Assigned Codes with points
            $assignedCodes = $db->table('tblCodigoEntrada')
                               ->where('id_usuario_asignado', $user['id'])
                               ->get()
                               ->getResultArray();
            $user['entry_codes'] = $assignedCodes;

            $user['points_earned'] = $earned;
            $user['points_spent']  = $spent;
        }

        return $this->respond($users);
    }

    /**
     * Create a new user
     */
    public function create()
    {
        $userModel = new UserModel();
        $data = $this->request->getJSON(true);

        if (empty($data['email']) || empty($data['password']) || empty($data['full_name'])) {
            return $this->fail('Email, password y nombre son requeridos.', 400);
        }

        // Check if user already exists
        if ($userModel->where('email', $data['email'])->first()) {
            return $this->fail('El usuario ya existe.', 409);
        }

        $newUser = [
            'id_proyecto'   => $data['id_proyecto'] ?? null,
            'email'         => $data['email'],
            'full_name'     => $data['full_name'],
            'password_hash' => password_hash($data['password'], PASSWORD_DEFAULT),
            'points'        => $data['points'] ?? 0,
            'role'          => $data['role'] ?? 'user'
        ];

        if ($userModel->save($newUser)) {
            $userId = $userModel->insertID();
            
            $successCount = 0;
            $duplicates = [];

            // Handle up to 10 entry codes with points
            if (!empty($data['entry_codes']) && is_array($data['entry_codes'])) {
                $db = \Config\Database::connect();
                foreach (array_slice($data['entry_codes'], 0, 10) as $codeData) {
                    $codeStr = is_array($codeData) ? ($codeData['codigo'] ?? '') : $codeData;
                    $points  = is_array($codeData) ? ($codeData['puntos'] ?? 10) : 10;
                    $codeStr = trim($codeStr);

                    if ($codeStr) {
                        // Global uniqueness check
                        $existsInEntry = $db->table('tblCodigoEntrada')->where('codigo', $codeStr)->countAllResults() > 0;
                        $existsInReward = $db->table('reward_codes')
                                             ->groupStart()
                                                ->where('code', $codeStr)->orWhere('code1', $codeStr)->orWhere('code2', $codeStr)
                                                ->orWhere('code3', $codeStr)->orWhere('code4', $codeStr)->orWhere('code5', $codeStr)
                                                ->orWhere('code6', $codeStr)->orWhere('code7', $codeStr)->orWhere('code8', $codeStr)
                                             ->groupEnd()
                                             ->countAllResults() > 0;
                        
                        if ($existsInEntry || $existsInReward) {
                            $duplicates[] = $codeStr;
                            continue;
                        }

                        $db->table('tblCodigoEntrada')->insert([
                            'id_usuario_asignado' => $userId,
                            'id_proyecto'         => $newUser['id_proyecto'],
                            'codigo'              => $codeStr,
                            'puntos'              => $points,
                            'is_used'             => 0
                        ]);
                        $successCount++;
                    }
                }
            }

            return $this->respondCreated([
                'status' => 'success', 
                'message' => 'Usuario creado exitosamente.',
                'code_summary' => [
                    'success_count' => $successCount,
                    'duplicate_count' => count($duplicates),
                    'duplicates' => $duplicates
                ]
            ]);
        } else {
            return $this->fail($userModel->errors());
        }
    }

    /**
     * Update a user
     */
    public function update($id = null)
    {
        if (!$id) return $this->fail('ID requerido');
        
        $userModel = new UserModel();
        $data = $this->request->getJSON(true);
        
        $updateData = [];
        if (isset($data['full_name'])) $updateData['full_name'] = $data['full_name'];
        if (isset($data['email'])) $updateData['email'] = $data['email'];
        if (isset($data['points'])) $updateData['points'] = $data['points'];
        if (isset($data['role'])) $updateData['role'] = $data['role'];
        if (isset($data['id_proyecto'])) $updateData['id_proyecto'] = $data['id_proyecto'];
        if (!empty($data['password'])) {
            $updateData['password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }

        if ($userModel->update($id, $updateData)) {
            $successCount = 0;
            $duplicates = [];

            // Update entry codes if provided
            if (isset($data['entry_codes']) && is_array($data['entry_codes'])) {
                $db = \Config\Database::connect();
                // Delete old codes that haven't been used yet to avoid duplicates/orphans
                $db->table('tblCodigoEntrada')
                   ->where('id_usuario_asignado', $id)
                   ->where('is_used', 0)
                   ->delete();

                foreach (array_slice($data['entry_codes'], 0, 10) as $codeData) {
                    $codeStr = is_array($codeData) ? ($codeData['codigo'] ?? '') : $codeData;
                    $points  = is_array($codeData) ? ($codeData['puntos'] ?? 10) : 10;
                    $codeStr = trim($codeStr);

                    if ($codeStr) {
                        // Global uniqueness check
                        $existsInEntry = $db->table('tblCodigoEntrada')->where('codigo', $codeStr)->countAllResults() > 0;
                        $existsInReward = $db->table('reward_codes')
                                             ->groupStart()
                                                ->where('code', $codeStr)->orWhere('code1', $codeStr)->orWhere('code2', $codeStr)
                                                ->orWhere('code3', $codeStr)->orWhere('code4', $codeStr)->orWhere('code5', $codeStr)
                                                ->orWhere('code6', $codeStr)->orWhere('code7', $codeStr)->orWhere('code8', $codeStr)
                                             ->groupEnd()
                                             ->countAllResults() > 0;
                        
                        if ($existsInEntry || $existsInReward) {
                            $duplicates[] = $codeStr;
                            continue;
                        }

                        $db->table('tblCodigoEntrada')->insert([
                            'id_usuario_asignado' => $id,
                            'id_proyecto'         => $updateData['id_proyecto'] ?? $userModel->find($id)['id_proyecto'],
                            'codigo'              => $codeStr,
                            'puntos'              => $points,
                            'is_used'             => 0
                        ]);
                        $successCount++;
                    }
                }
            }
            return $this->respond([
                'status' => 'success', 
                'message' => 'Usuario actualizado.',
                'code_summary' => [
                    'success_count' => $successCount,
                    'duplicate_count' => count($duplicates),
                    'duplicates' => $duplicates
                ]
            ]);
        } else {
            return $this->fail($userModel->errors());
        }
    }

    /**
     * Block/Unblock user
     */
    public function toggleBlock($id = null)
    {
        if (!$id) return $this->fail('ID de usuario requerido');

        $userModel = new UserModel();
        $logModel  = new SecurityLogModel();
        $data      = $this->request->getJSON(true);

        $user = $userModel->find($id);
        if (!$user) return $this->failNotFound('Usuario no encontrado');

        $isBlocking = !empty($data['block']);

        if ($isBlocking) {
            $reason = $data['reason'] ?? 'Actividad sospechosa';
            $userModel->update($id, [
                'is_blocked'     => 1,
                'blocked_reason' => $reason,
                'blocked_at'     => date('Y-m-d H:i:s')
            ]);
            $logModel->save([
                'ip_address' => $this->request->getIPAddress(),
                'user_id'    => $id,
                'action'     => 'user_blocked',
                'details'    => "Usuario bloqueado por admin. Razón: {$reason}"
            ]);
            $message = 'Usuario bloqueado exitosamente';
        } else {
            $userModel->update($id, [
                'is_blocked'     => 0,
                'blocked_reason' => null,
                'blocked_at'     => null
            ]);
            $logModel->save([
                'ip_address' => $this->request->getIPAddress(),
                'user_id'    => $id,
                'action'     => 'user_unblocked',
                'details'    => 'Usuario desbloqueado por admin'
            ]);
            $message = 'Usuario desbloqueado exitosamente';
        }

        return $this->respond(['status' => 'success', 'message' => $message]);
    }

    public function getStats()
    {
        $userModel = new UserModel();
        return $this->respond([
            'total'    => $userModel->countAllResults(),
            'blocked'  => $userModel->where('is_blocked', 1)->countAllResults(),
            'active'   => $userModel->where('is_blocked', 0)->countAllResults()
        ]);
    }
}
