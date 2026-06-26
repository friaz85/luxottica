<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use App\Models\UserModel;
use App\Models\SecurityLogModel;
use App\Services\PasswordCryptoService;

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

        $idProyecto = $data['id_proyecto'] ?? null;
        $email = strtolower(trim($data['email'] ?? ''));
        if ($idProyecto) {
            $prefix = 'pr' . $idProyecto . '-';
            $emailClean = preg_replace('/^pr' . $idProyecto . '-?/', '', $email);
            $email = $prefix . $emailClean;
        }

        // Check if user already exists
        if ($userModel->where('email', $email)->first()) {
            return $this->fail('El usuario ya existe.', 409);
        }

        $newUser = [
            'id_proyecto'   => $idProyecto,
            'email'         => $email,
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
        if (isset($data['points'])) $updateData['points'] = $data['points'];
        if (isset($data['role'])) $updateData['role'] = $data['role'];
        if (isset($data['id_proyecto'])) $updateData['id_proyecto'] = $data['id_proyecto'];
        if (!empty($data['password'])) {
            $updateData['password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }

        $currentUser = $userModel->find($id);
        $email = isset($data['email']) ? strtolower(trim($data['email'])) : strtolower(trim($currentUser['email']));
        $targetProject = isset($updateData['id_proyecto']) ? $updateData['id_proyecto'] : $currentUser['id_proyecto'];
        if ($targetProject) {
            $prefix = 'pr' . $targetProject . '-';
            $emailClean = preg_replace('/^pr' . $targetProject . '-?/', '', $email);
            // Also clean any previous project prefix if project changed
            $currentProject = $currentUser['id_proyecto'];
            if ($currentProject && $currentProject != $targetProject) {
                $emailClean = preg_replace('/^pr' . $currentProject . '-?/', '', $emailClean);
            }
            $email = $prefix . $emailClean;
        }

        if (isset($data['email']) || isset($updateData['id_proyecto'])) {
            // Check if updated email is already taken by another user
            $existingUser = $userModel->where('email', $email)->first();
            if ($existingUser && $existingUser['id'] != $id) {
                return $this->fail('El usuario ya existe con ese identificador.', 409);
            }
            $updateData['email'] = $email;
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

    /**
     * Bulk upload users.
     * Accepts multipart/form-data:
     *   - file:        the original CSV/XLSX file to store
     *   - id_proyecto: project ID
     *   - users:       JSON-encoded array [{full_name, email, points}]
     */
    public function bulkUpload()
    {
        $userModel = new UserModel();
        $db        = \Config\Database::connect();

        // Read fields from POST (multipart)
        $idProyecto  = $this->request->getPost('id_proyecto');
        $usersJson   = $this->request->getPost('users');
        $usersToLoad = json_decode($usersJson, true) ?? [];

        if (!$idProyecto) {
            return $this->fail('El proyecto es requerido.', 400);
        }
        if (empty($usersToLoad) || !is_array($usersToLoad)) {
            return $this->fail('No hay usuarios para procesar.', 400);
        }

        // Save original file if provided
        $savedFileName = null;
        $uploadedFile  = $this->request->getFile('file');
        if ($uploadedFile && $uploadedFile->isValid() && !$uploadedFile->hasMoved()) {
            $originalName  = pathinfo($uploadedFile->getClientName(), PATHINFO_FILENAME);
            $ext           = $uploadedFile->getClientExtension();
            $savedFileName = date('Ymd_His') . '_' . preg_replace('/[^a-zA-Z0-9_-]/', '_', $originalName) . '.' . $ext;
            $uploadedFile->move(FCPATH . 'uploads/user_imports', $savedFileName);
        }

        // Get project name for log
        $project     = $db->table('tblProyecto')->where('idProyecto', $idProyecto)->get()->getRow();
        $projectName = $project ? $project->Proyecto : 'Desconocido';

        // Get admin info from session/token
        $adminId = $this->request->admin_user->username ?? 'admin';

        $logData      = [];
        $successCount = 0;
        $errorCount   = 0;

        foreach ($usersToLoad as $row) {
            // Support both old format (full_name, email, points) and new XLSX format
            // New format: ID=user/login, Descripcion_Depto=full_name, Depto_ID=depto_id, $$=points
            $fullName = trim($row['full_name'] ?? $row['Descripcion_Depto'] ?? $row['nombre'] ?? '');
            $userLogin = trim($row['email'] ?? $row['user'] ?? $row['ID'] ?? '');
            $deptoId  = trim($row['depto_id'] ?? $row['Depto_ID'] ?? '');
            $points   = (int) ($row['points'] ?? $row['puntos'] ?? $row['$$'] ?? 0);

            // Use userLogin as the email/identifier with PR + project_id prefix
            $emailRaw = strtolower($userLogin);
            if ($idProyecto) {
                $prefix = 'pr' . $idProyecto . '-';
                $emailClean = preg_replace('/^pr' . $idProyecto . '-?/', '', $emailRaw);
                $email = $prefix . $emailClean;
            } else {
                $email = $emailRaw;
            }

            if (empty($email) || empty($fullName)) {
                $logData[] = [
                    'full_name' => $fullName,
                    'email'     => $email,
                    'depto_id'  => $deptoId,
                    'points'    => $points,
                    'password'  => '',
                    'status'    => 'error',
                    'message'   => 'Nombre o usuario vacío'
                ];
                $errorCount++;
                continue;
            }

            // Check duplicate user
            if ($userModel->where('email', $email)->first()) {
                $logData[] = [
                    'full_name' => $fullName,
                    'email'     => $email,
                    'depto_id'  => $deptoId,
                    'points'    => $points,
                    'password'  => '',
                    'status'    => 'error',
                    'message'   => 'Usuario ya registrado'
                ];
                $errorCount++;
                continue;
            }

            // Generate password: only uppercase letters and digits, excluding 0, O, I, 1, 2, Z, G, 6 (10 characters)
            $allowedChars = 'ABCDEFHJKLNMPQRSTUVWXY345789';
            $plainPassword = '';
            for ($i = 0; $i < 10; $i++) {
                $plainPassword .= $allowedChars[random_int(0, strlen($allowedChars) - 1)];
            }


            $newUser = [
                'id_proyecto'      => $idProyecto,
                'email'            => $email,
                'full_name'        => $fullName,
                'depto_id'         => $deptoId ?: null,
                'password_hash'    => password_hash($plainPassword, PASSWORD_DEFAULT),
                'password_encrypted' => PasswordCryptoService::encrypt($plainPassword),
                'points'           => $points,
                'role'             => 'user'
            ];

            if ($userModel->save($newUser)) {
                $successCount++;
                $logData[] = [
                    'full_name' => $fullName,
                    'email'     => $email,
                    'depto_id'  => $deptoId,
                    'points'    => $points,
                    'password'  => $plainPassword,
                    'status'    => 'success',
                    'message'   => 'Creado correctamente'

                ];
            } else {
                $errorCount++;
                $logData[] = [
                    'full_name' => $fullName,
                    'email'     => $email,
                    'points'    => $points,
                    'password'  => '',
                    'status'    => 'error',
                    'message'   => 'Error al guardar'
                ];
            }
        }

        // Save log (with original_file reference)
        $db->table('user_upload_logs')->insert([
            'id_proyecto'   => $idProyecto,
            'project_name'  => $projectName,
            'uploaded_by'   => $adminId,
            'total_rows'    => count($usersToLoad),
            'success_count' => $successCount,
            'error_count'   => $errorCount,
            'original_file' => $savedFileName,
            'log_data'      => json_encode($logData, JSON_UNESCAPED_UNICODE)
        ]);

        return $this->respondCreated([
            'success_count' => $successCount,
            'error_count'   => $errorCount,
            'project_name'  => $projectName,
            'original_file' => $savedFileName,
            'users'         => $logData
        ]);
    }

    /**
     * Download the original uploaded file for a given log ID
     */
    public function downloadOriginalFile($id = null)
    {
        $db  = \Config\Database::connect();
        $log = $db->table('user_upload_logs')->select('original_file, project_name, uploaded_at')->where('id', $id)->get()->getRowArray();

        if (!$log || empty($log['original_file'])) {
            return $this->failNotFound('Archivo original no encontrado para esta carga.');
        }

        $filePath = FCPATH . 'uploads/user_imports/' . $log['original_file'];
        if (!file_exists($filePath)) {
            return $this->failNotFound('El archivo ya no existe en el servidor.');
        }

        $ext      = pathinfo($filePath, PATHINFO_EXTENSION);
        $mimeMap  = ['csv' => 'text/csv', 'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xls' => 'application/vnd.ms-excel'];
        $mime     = $mimeMap[$ext] ?? 'application/octet-stream';
        $download = 'carga_' . date('Ymd', strtotime($log['uploaded_at'])) . '_' . preg_replace('/[^a-zA-Z0-9]/', '_', $log['project_name']) . '.' . $ext;

        return $this->response
            ->setHeader('Content-Type', $mime)
            ->setHeader('Content-Disposition', 'attachment; filename="' . $download . '"')
            ->setHeader('Content-Length', filesize($filePath))
            ->setBody(file_get_contents($filePath));
    }

    /**
     * List all upload logs (paginated)
     */
    public function getUploadLogs()
    {
        $db   = \Config\Database::connect();
        $logs = $db->table('user_upload_logs')
                   ->select('id, id_proyecto, project_name, uploaded_by, total_rows, success_count, error_count, original_file, uploaded_at')
                   ->orderBy('uploaded_at', 'DESC')
                   ->get()
                   ->getResultArray();
        return $this->respond($logs);
    }

    /**
     * Get full detail of a single upload log (with log_data for re-download)
     */
    public function getUploadLogDetail($id = null)
    {
        $db  = \Config\Database::connect();
        $log = $db->table('user_upload_logs')->where('id', $id)->get()->getRowArray();
        if (!$log) {
            return $this->failNotFound('Log no encontrado');
        }
        $log['log_data'] = json_decode($log['log_data'], true);
        return $this->respond($log);
    }

    /**
     * migratePasswords() — One-time migration: reads upload logs and populates
     * password_encrypted for existing users that don't have it yet.
     * POST /admin/users/migrate-passwords
     */
    public function migratePasswords()
    {
        $db      = \Config\Database::connect();
        $updated = 0;
        $skipped = 0;
        $errors  = 0;

        // Build a map of email → plain password from all upload logs
        $logRows = $db->table('user_upload_logs')->select('log_data')->get()->getResultArray();
        $pwMap   = [];
        foreach ($logRows as $lr) {
            $entries = json_decode($lr['log_data'] ?? '[]', true) ?? [];
            foreach ($entries as $entry) {
                $email = strtolower(trim($entry['email'] ?? ''));
                $pw    = trim($entry['password'] ?? '');
                if ($email && $pw && !isset($pwMap[$email])) {
                    $pwMap[$email] = $pw;
                }
            }
        }

        // Update each user that still has password_encrypted empty
        foreach ($pwMap as $email => $plain) {
            $user = $db->table('users')
                       ->select('id, password_encrypted')
                       ->where('email', $email)
                       ->get()->getRowArray();

            if (!$user) { $skipped++; continue; }

            // Skip if already encrypted
            if (!empty($user['password_encrypted'])) { $skipped++; continue; }

            try {
                $encrypted = PasswordCryptoService::encrypt($plain);
                $db->table('users')->where('id', $user['id'])
                   ->update(['password_encrypted' => $encrypted]);
                $updated++;
            } catch (\Exception $e) {
                $errors++;
            }
        }

        return $this->respond([
            'success' => true,
            'updated' => $updated,
            'skipped' => $skipped,
            'errors'  => $errors,
            'message' => "Migración completada: $updated actualizados, $skipped omitidos, $errors errores."
        ]);
    }

    /**
     * userReport() — Reporte de usuarios por proyecto con puntos.
     * GET /admin/users/report?id_proyecto=1&export=csv
     */
    public function userReport()
    {
        $db         = \Config\Database::connect();
        $idProyecto = $this->request->getGet('id_proyecto');
        $exportCsv  = $this->request->getGet('export') === 'csv';

        $builder = $db->table('users u')
            ->select('u.email as user_login, u.full_name, u.password_encrypted,
                      u.depto_id, u.points, u.points_used, u.points_remaining,
                      u.is_blocked, u.created_at,
                      p.Proyecto as project_name')
            ->join('tblProyecto p', 'p.idProyecto = u.id_proyecto', 'left')
            ->where('u.role', 'user')
            ->orderBy('u.full_name', 'ASC');

        if ($idProyecto) {
            $builder->where('u.id_proyecto', $idProyecto);
        }

        $data = $builder->get()->getResultArray();

        // Decrypt passwords for report
        foreach ($data as &$row) {
            try {
                $row['password_display'] = !empty($row['password_encrypted'])
                    ? PasswordCryptoService::decrypt($row['password_encrypted'])
                    : '—';
            } catch (\Exception $e) {
                $row['password_display'] = '—';
            }
            unset($row['password_encrypted']); // never expose raw encrypted field
        }
        unset($row);

        if ($exportCsv) {
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="reporte_usuarios_' . date('Y-m-d') . '.csv"');
            $out = fopen('php://output', 'w');
            fprintf($out, chr(0xEF) . chr(0xBB) . chr(0xBF)); // UTF-8 BOM
            fputcsv($out, ['Usuario', 'Nombre', 'Contraseña', 'Depto', 'Puntos Asignados', 'Puntos Utilizados', 'Puntos Restantes', 'Proyecto', 'Bloqueado', 'Alta']);
            foreach ($data as $row) {
                fputcsv($out, [
                    $row['user_login'],
                    $row['full_name'],
                    $row['password_display'],
                    $row['depto_id'] ?? '',
                    $row['points'],
                    $row['points_used'],
                    $row['points_remaining'],
                    $row['project_name'] ?? '',
                    $row['is_blocked'] ? 'Sí' : 'No',
                    date('Y-m-d', strtotime($row['created_at']))
                ]);
            }
            fclose($out);
            exit;
        }

        return $this->respond($data);
    }
}
