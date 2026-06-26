<?php

namespace App\Controllers;

use App\Models\RedemptionModel;
use App\Models\UserModel;
use App\Models\RewardModel;
use App\Models\RewardCodeModel;
use App\Models\SecurityLogModel;
use CodeIgniter\RESTful\ResourceController;
use setasign\Fpdi\Fpdi;
use App\Libraries\EmailSender;

class AdminRedemptionsController extends ResourceController
{
    public function manualRedeem()
    {
        // 🛡️ SECURITY: Only system_admin
        if (($this->request->admin_user->role ?? null) !== 'system_admin') {
            return $this->failForbidden('Solo administradores de sistema pueden realizar esta acción.');
        }

        $db              = \Config\Database::connect();
        $userModel       = new UserModel();
        $rewardModel     = new RewardModel();
        $rewardCodeModel = new RewardCodeModel();
        $redemptionModel = new RedemptionModel();
        $logModel        = new SecurityLogModel();

        $userId   = $this->request->getVar('user_id');
        $rewardId = $this->request->getVar('reward_id') ?: 23; // Default to BOLETO DE CINE 2X1

        $user   = $userModel->find($userId);
        $reward = $rewardModel->find($rewardId);

        if (!$user) return $this->failNotFound('Usuario no encontrado.');
        if (!$reward) return $this->failNotFound('Recompensa ID ' . $rewardId . ' no encontrada.');
        if ($reward['stock'] <= 0) return $this->fail('Recompensa sin stock.');
        if ($user['points'] < $reward['cost']) return $this->fail('El usuario no tiene puntos suficientes.');

        // --- Determine codes needed ---
        $codesCount  = (int) ($reward['codes_count'] ?? 0);
        $neededCount = $codesCount > 0 ? $codesCount : 1;

        if ($codesCount <= 0) {
            $codeAreasStr = $reward['code_areas'] ?? '';
            $areas        = array_filter(explode(';', $codeAreasStr));
            $neededCount  = count($areas) > 0 ? count($areas) : 1;
        }

        $hasInventory = $rewardCodeModel->where('reward_id', $rewardId)->countAllResults() > 0;
        $codesList    = [];

        $db->transStart();

        if ($hasInventory) {
            $availableRow = $rewardCodeModel->where('reward_id', $rewardId)
                ->where('is_used', 0)
                ->first();

            if (!$availableRow) {
                $db->transRollback();
                return $this->fail('No hay códigos suficientes en inventario para esta recompensa.');
            }

            $rewardCodeModel->update($availableRow['id'], ['is_used' => 1]);
            
            for ($i = 1; $i <= $neededCount; $i++) {
                $colName = "code$i";
                $codesList[] = $availableRow[$colName] ?: $availableRow['code'];
            }
        } else {
            for ($i = 0; $i < $neededCount; $i++) {
                $tempId        = time() . rand(1000, 9999) . $i;
                $generatedCode = 'TEC-ADMIN-' . str_pad($userId . rand(0, 99), 6, '0', STR_PAD_LEFT) . '-' . strtoupper(substr(md5($tempId), 0, 4));
                $codesList[]   = $generatedCode;
            }
        }

        // Deduct Points and Stock
        $userModel->update($userId, ['points' => $user['points'] - $reward['cost']]);
        $rewardModel->update($rewardId, ['stock' => $reward['stock'] - 1]);

        $finalCodeString = implode(',', $codesList);

        $redemptionData = [
            'user_id'      => $userId,
            'reward_id'    => $rewardId,
            'status'       => 'completed',
            'digital_code' => $finalCodeString,
            'admin_notes'  => 'Canje manual realizado por ' . ($this->request->admin_user->username ?? 'admin')
        ];
        
        $redemptionModel->save($redemptionData);
        $redemptionId = $redemptionModel->insertID();

        // PDF Generation
        $pdfUrl = $this->generateAndSavePdf($user, $reward, $redemptionId, $codesList);
        if ($pdfUrl) {
            $filename = basename($pdfUrl);
            if ($redemptionModel->update($redemptionId, ['pdf_path' => $filename])) {
                log_message('info', "Manual PDF Path saved successfully for redemption {$redemptionId}: {$filename}");
            } else {
                log_message('error', "Failed to update manual pdf_path in DB for redemption {$redemptionId}. Errors: " . json_encode($redemptionModel->errors()));
            }
        } else {
            log_message('error', "Manual generateAndSavePdf returned NULL for redemption {$redemptionId}. Check previous logs.");
        }

        $logModel->save([
            'ip_address' => rand(1, 254) . '.' . rand(1, 254) . '.' . rand(1, 254) . '.' . rand(1, 254),
            'user_id'    => $userId,
            'action'     => 'success_redeem',
            'details'    => ".Code Redeemed: " . $finalCodeString
        ]);

        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->failServerError('Error en la transacción de canje.');
        }

        return $this->respond([
            'status'  => 'success',
            'message' => '¡Canje especial realizado exitosamente!',
            'code'    => $finalCodeString
        ]);
    }

    private function generateAndSavePdf($user, $reward, $redemptionId, $codes)
    {
        try {
            if (empty($reward['pdf_template'])) {
                log_message('error', "Manual PDF Template name is EMPTY for Reward ID: " . $rewardId);
                return null;
            }
            $templatePath = FCPATH . 'uploads/templates/' . $reward['pdf_template'];
            log_message('debug', "Searching for Manual PDF template at: " . $templatePath);
            if (!file_exists($templatePath)) {
                log_message('error', "Manual PDF Template NOT FOUND: " . $templatePath);
                return null;
            }

            $filename   = 'tec_manual_' . $redemptionId . '_' . time() . '.pdf';
            $outputPath = FCPATH . 'uploads/redeemed/' . $filename;
            log_message('debug', "Generating manual PDF at: " . $outputPath);

            if (!is_dir(dirname($outputPath))) {
                if (!mkdir(dirname($outputPath), 0777, true)) {
                    log_message('error', "COULD NOT CREATE Manual PDF directory: " . dirname($outputPath));
                }
            }

            $pdf = new Fpdi();
            $pdf->setSourceFile($templatePath);
            $tplIdx = $pdf->importPage(1);
            $size = $pdf->getTemplateSize($tplIdx);
            $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
            $pdf->useTemplate($tplIdx);

            $codeAreas = $reward['code_areas'] ?? '';
            if (!is_array($codes)) $codes = explode(',', $codes);

            if (!empty($codeAreas)) {
                $areas = explode(';', $codeAreas);
                foreach ($areas as $index => $areaStr) {
                    $currentCode = $codes[$index] ?? $codes[0];
                    $parts = explode(',', trim($areaStr));
                    if (count($parts) >= 4) {
                        $x = (floatval($parts[0]) / 100) * $size['width'];
                        $y = (floatval($parts[1]) / 100) * $size['height'];
                        $w = (floatval($parts[2]) / 100) * $size['width'];
                        $h = (floatval($parts[3]) / 100) * $size['height'];
                        $fontSize = isset($parts[4]) ? intval($parts[4]) : 14;
                        $pdf->SetFont('Arial', 'B', $fontSize);
                        $pdf->SetXY($x, $y);
                        if ($w > 0 && $h > 0) $pdf->Cell($w, $h, $currentCode, 0, 0, 'C');
                        else $pdf->Text($x, $y, $currentCode);
                    }
                }
            }
            $pdf->Output($outputPath, 'F');
            return base_url('uploads/redeemed/' . $filename);
        } catch (\Exception $e) {
            log_message('error', "Manual PDF FATAL ERROR (Redemption ID: {$redemptionId}): " . $e->getMessage());
            log_message('error', "Stack trace: " . $e->getTraceAsString());
            return null;
        }
    }
    public function index()
    {
        try {
            $db      = \Config\Database::connect();
            $builder = $db->table('redemptions');

            $builder->select('
                redemptions.id,
                redemptions.created_at,
                redemptions.status,
                redemptions.nombre_monedero,
                redemptions.apellido_paterno,
                redemptions.apellido_materno,
                redemptions.telefono_recarga,
                redemptions.id_telefonia,
                redemptions.status_recarga,
                users.full_name as user_name,
                users.email as user_email,
                users.email as user_login,
                rewards.title as reward_name,
                rewards.type as reward_type,
                rewards.tipo_recompensa,
                rewards.cost as points_cost,
                tel.Telefonia as nombre_telefonia
            ');
            $builder->join('users', 'users.id = redemptions.user_id', 'left');
            $builder->join('rewards', 'rewards.id = redemptions.reward_id', 'left');
            $builder->join('tblTelefonia tel', 'tel.idTelefonia = redemptions.id_telefonia', 'left');

            // Search Filter
            $search = $this->request->getGet('search');
            if ($search) {
                $builder->groupStart()
                    ->like('users.email', $search)
                    ->orLike('users.full_name', $search)
                    ->orLike('rewards.title', $search)
                    ->groupEnd();
            }

            // Order
            $builder->orderBy('redemptions.created_at', 'ASC');

            // Export CSV Logic
            if ($this->request->getGet('export') === 'csv') {
                $data = $builder->get()->getResultArray();

                // Helper to mask email
                $maskEmail = function ($email) {
                    if (!$email)
                        return '';
                    $parts = explode('@', $email);
                    if (count($parts) != 2)
                        return $email;
                    $name = $parts[0];
                    if (strlen($name) <= 4)
                        return str_repeat('*', strlen($name)) . '@' . $parts[1];
                    return str_repeat('*', 4) . substr($name, 4) . '@' . $parts[1];
                };

                // Generate CSV
                header('Content-Type: text/csv');
                header('Content-Disposition: attachment; filename="reporte_canjes_' . date('Y-m-d') . '.csv"');
                $out = fopen('php://output', 'w');
                fputcsv($out, ['Usuario', 'Recompensa', 'Fecha']);

                foreach ($data as $row) {
                    fputcsv($out, [
                        $maskEmail($row['user_email']),
                        $row['reward_name'],
                        date('Y-m-d', strtotime($row['created_at']))
                    ]);
                }
                fclose($out);
                exit;
            }

            // Pagination Logic
            $pageParam = $this->request->getGet('page');

            if ($pageParam === null) {
                // Return all entries when no page is specified
                $data = $builder->get()->getResultArray();
                return $this->respond($data);
            }

            $page    = (int) $pageParam;
            $perPage = (int) ($this->request->getGet('per_page') ?? 10);
            $offset  = ($page - 1) * $perPage;

            // Clone builder for counting
            $countBuilder = clone $builder;
            $total        = $countBuilder->countAllResults();

            // Fetch Data
            $data = $builder->get($perPage, $offset)->getResultArray();

            return $this->respond([
                'data'  => $data,
                'pager' => [
                    'current_page' => $page,
                    'per_page'     => $perPage,
                    'total_pages'  => ceil($total / $perPage),
                    'total_items'  => $total
                ]
            ]);

        } catch (\Exception $e) {
            log_message('error', 'AdminRedemptionsController error: ' . $e->getMessage());
            return $this->failServerError($e->getMessage());
        }
    }

    /**
     * pendingRewards() — Lista canjes pendientes de monedero (solo proceso manual).
     */
    public function pendingRewards()
    {
        try {
            $db = \Config\Database::connect();

            $page    = (int)($this->request->getGet('page') ?? 1);
            $perPage = (int)($this->request->getGet('per_page') ?? 20);
            $offset  = ($page - 1) * $perPage;
            $search  = $this->request->getGet('search');

            $builder = $db->table('redemptions r')
                ->select('r.id, r.created_at, r.status,
                          r.nombre_monedero, r.apellido_paterno, r.apellido_materno,
                          r.telefono_recarga, r.id_telefonia, r.status_recarga,
                          u.full_name as user_name, u.email as user_login,
                          rw.title as reward_name, rw.tipo_recompensa, rw.cost as points_cost,
                          rw.monto_recarga,
                          tel.Telefonia as nombre_telefonia, tel.SKU as telefonia_sku,
                          CONCAT(tel.SKU, LPAD(rw.monto_recarga, 3, "0")) as producto')
                ->join('users u',          'u.id = r.user_id',              'left')
                ->join('rewards rw',       'rw.id = r.reward_id',           'left')
                ->join('tblTelefonia tel', 'tel.idTelefonia = r.id_telefonia', 'left')
                ->where('r.status', 'pending')
                ->groupStart()
                    ->where('rw.tipo_recompensa', 'monedero')
                ->groupEnd();

            if ($search) {
                $builder->groupStart()
                    ->like('u.full_name', $search)
                    ->orLike('u.email', $search)
                    ->orLike('r.telefono_recarga', $search)
                    ->orLike('r.nombre_monedero', $search)
                ->groupEnd();
            }

            $builder->orderBy('r.created_at', 'DESC');

            $total = (clone $builder)->countAllResults(false);
            $data  = $builder->get($perPage, $offset)->getResultArray();

            return $this->respond([
                'data'  => $data,
                'pager' => [
                    'current_page' => $page,
                    'per_page'     => $perPage,
                    'total_pages'  => (int)ceil($total / $perPage),
                    'total_items'  => $total,
                ],
            ]);
        } catch (\Exception $e) {
            log_message('error', 'pendingRewards error: ' . $e->getMessage());
            return $this->failServerError($e->getMessage());
        }
    }

    /**
     * markSent($id) — Admin marca un canje pendiente como completado y puede adjuntar el cupón.
     */
    public function markSent($id = null)
    {
        try {
            $db = \Config\Database::connect();
            $row = $db->table('redemptions')->where('id', $id)->get()->getRowArray();

            if (!$row) {
                return $this->failNotFound('Canje no encontrado.');
            }

            $updateData = [
                'status'         => 'completed',
                'status_recarga' => 'success',
                'updated_at'     => date('Y-m-d H:i:s'),
            ];

            // Handle coupon file upload
            $file = $this->request->getFile('coupon_file');
            if ($file && $file->isValid() && !$file->hasMoved()) {
                $uploadsDir = WRITEPATH . '../public/uploads/redeemed/';
                if (!is_dir($uploadsDir)) {
                    mkdir($uploadsDir, 0755, true);
                }
                $newName = time() . '_' . bin2hex(random_bytes(8)) . '.' . $file->getClientExtension();
                $file->move($uploadsDir, $newName);
                $updateData['pdf_path'] = $newName;
            }

            $db->table('redemptions')->where('id', $id)->update($updateData);

            return $this->respond(['success' => true, 'message' => 'Marcado como enviado correctamente.']);
        } catch (\Exception $e) {
            log_message('error', 'markSent error: ' . $e->getMessage());
            return $this->failServerError($e->getMessage());
        }
    }
}
