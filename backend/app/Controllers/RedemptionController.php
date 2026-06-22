<?php

namespace App\Controllers;

use App\Models\UserModel;
use App\Models\RewardModel;
use App\Models\RewardCodeModel;
use App\Models\RedemptionModel;
use App\Models\SecurityLogModel;
use CodeIgniter\RESTful\ResourceController;
use setasign\Fpdi\Fpdi;
use App\Libraries\EmailSender;

class RedemptionController extends ResourceController
{
    /**
     * Reemplaza la funcionalidad de registro de códigos de Takis.
     * En Luxottica no se registran códigos.
     */
    public function redeemCode()
    {
        return $this->fail('Funcionalidad no disponible en este portal.', 404);
    }

    public function redeemReward()
    {
        $db              = \Config\Database::connect();
        $userModel       = new UserModel();
        $rewardModel     = new RewardModel();
        $rewardCodeModel = new RewardCodeModel();
        $redemptionModel = new RedemptionModel();
        $logModel        = new SecurityLogModel();

        $userId          = $this->request->user->id ?? $this->request->user->uid ?? null;
        $rewardId        = $this->request->getVar('reward_id');
        // Separate fields (replaces JSON extra_data)
        $nombreMonedero  = trim($this->request->getVar('nombre_monedero')  ?? '');
        $apellidoPaterno = trim($this->request->getVar('apellido_paterno') ?? '');
        $apellidoMaterno = trim($this->request->getVar('apellido_materno') ?? '');
        $telefonoRecarga = trim($this->request->getVar('telefono_recarga') ?? '');
        $idTelefonia     = (int)($this->request->getVar('id_telefonia') ?? 0);

        log_message('error', "Redemption attempt: User ID {$userId}, Reward ID: " . json_encode($rewardId));

        $user = $userModel->find($userId);

        $user = $userModel->find($userId);

        if ($user && isset($user['is_blocked']) && (int) $user['is_blocked'] === 1) {
            return $this->fail('Tu cuenta ha sido bloqueada. No puedes realizar esta accion.', 403);
        }

        // Check Project Expiration
        if (isset($user['id_proyecto'])) {
            $proyectoModel = new \App\Models\ProyectoModel();
            if (!$proyectoModel->isProjectActive($user['id_proyecto'])) {
                return $this->fail('La vigencia de su participación ha finalizado. Ya no es posible realizar canjes.', 403);
            }
        }

        $reward = $rewardModel->find($rewardId);

        if (!$reward || $reward['stock'] <= 0) {
            return $this->respond(['message' => 'Recompensa no disponible (Stock agotado).'], 400);
        }

        if ($user['points'] < $reward['cost']) {
            return $this->respond(['message' => 'Puntos insuficientes.'], 400);
        }

        $tipoRecompensa = $reward['tipo_recompensa'] ?? 'normal';

        // Validate required extra fields by tipo_recompensa
        if ($tipoRecompensa === 'monedero' && (empty($nombreMonedero) || empty($apellidoPaterno))) {
            return $this->respond(['message' => 'Nombre y apellido paterno son requeridos para esta recompensa.'], 400);
        }
        if ($tipoRecompensa === 'tiempo_aire' && (empty($telefonoRecarga) || !$idTelefonia)) {
            return $this->respond(['message' => 'Número de teléfono y telefonía son requeridos para esta recompensa.'], 400);
        }

        // --- Determine number of codes needed ---
        $codesCount  = (int) ($reward['codes_count'] ?? 0);
        $neededCount = $codesCount > 0 ? $codesCount : 1;

        // If no explicit codes_count, fallback to areas count
        if ($codesCount <= 0) {
            $codeAreasStr = $reward['code_areas'] ?? '';
            $areas        = array_filter(explode(';', $codeAreasStr));
            $neededCount  = count($areas) > 0 ? count($areas) : 1;
        }

        // --- Strategy: Inventory (Pre-loaded) vs Generated ---
        $hasInventory = $rewardCodeModel->where('reward_id', $rewardId)->countAllResults() > 0;
        $codesList    = [];

        try {
            $db->transStart();

            if ($hasInventory) {
                // Find a code where the associated validity (if any) is currently active, or has no validity limit.
                // We connect to the DB and check which codes are unused.
                $nowStr = date('Y-m-d H:i:s');
                $availableRow = $rewardCodeModel->select('reward_codes.*')
                    ->join('vigencias', 'vigencias.id = reward_codes.id_vigencia', 'left')
                    ->where('reward_codes.reward_id', $rewardId)
                    ->where('reward_codes.is_used', 0)
                    ->groupStart()
                        ->where('reward_codes.id_vigencia IS NULL')
                        ->orGroupStart()
                            ->where('vigencias.fecha_inicio <=', $nowStr)
                            ->where('vigencias.fecha_fin >=', $nowStr)
                        ->groupEnd()
                    ->groupEnd()
                    ->orderBy('reward_codes.id', 'ASC')
                    ->first();

                if (!$availableRow) {
                    $db->transRollback();
                    return $this->respond(['message' => 'Lo sentimos, no hay suficientes códigos disponibles que no hayan caducado para esta recompensa.'], 400);
                }

                // Mark as used
                if (!$rewardCodeModel->update($availableRow['id'], ['is_used' => 1])) {
                    throw new \Exception("Error updating reward code: " . json_encode($rewardCodeModel->errors()));
                }
                
                // Extract codes
                for ($i = 1; $i <= $neededCount; $i++) {
                    $colName = "code$i";
                    $codesList[] = $availableRow[$colName] ?: $availableRow['code'];
                }
            } else {
                for ($i = 0; $i < $neededCount; $i++) {
                    $tempId        = time() . rand(1000, 9999) . $i;
                    $generatedCode = 'TEC-' . str_pad($userId . rand(0, 99), 6, '0', STR_PAD_LEFT) . '-' . strtoupper(substr(md5($tempId), 0, 4));
                    $codesList[]   = $generatedCode;
                }
            }

            // Deduct Points and Stock
            $newPoints = $user['points'] - $reward['cost'];
            $newUsed = ($user['points_used'] ?? 0) + $reward['cost'];
            if (!$userModel->update($userId, [
                'points'           => $newPoints,
                'points_used'      => $newUsed,
                'points_remaining' => $newPoints
            ])) {
                throw new \Exception("Error updating user points fields: " . json_encode($userModel->errors()));
            }

            $newStock = (int)$reward['stock'] - 1;
            if (!$rewardModel->update($rewardId, ['stock' => $newStock])) {
                throw new \Exception("Error updating reward stock: " . json_encode($rewardModel->errors()));
            }

            $finalCodeString = implode(',', $codesList);

            $redemptionData = [
                'user_id'          => $userId,
                'reward_id'        => $rewardId,
                'status'           => ($reward['type'] === 'digital') ? 'completed' : 'pending',
                'digital_code'     => $finalCodeString,
                'extra_data'       => null, // deprecated, kept for compatibility
                'nombre_monedero'  => ($tipoRecompensa === 'monedero')   ? $nombreMonedero  : null,
                'apellido_paterno' => ($tipoRecompensa === 'monedero')   ? $apellidoPaterno : null,
                'apellido_materno' => ($tipoRecompensa === 'monedero')   ? $apellidoMaterno : null,
                'telefono_recarga' => ($tipoRecompensa === 'tiempo_aire') ? $telefonoRecarga : null,
                'id_telefonia'     => ($tipoRecompensa === 'tiempo_aire') ? $idTelefonia     : null,
                'status_recarga'   => ($tipoRecompensa === 'tiempo_aire') ? 'pending' : null,
            ];

            if (!$redemptionModel->save($redemptionData)) {
                throw new \Exception("Error saving redemption: " . json_encode($redemptionModel->errors()));
            }
            $redemptionId = $redemptionModel->insertID();

            // Generate PDF or handle wallpaper
            $pdfUrl      = null;

            if (strtolower($reward['type'] ?? '') === 'digital') {
                $templateExt     = pathinfo($reward['pdf_template'] ?? '', PATHINFO_EXTENSION);
                $isImageTemplate = in_array(strtolower($templateExt), ['jpg', 'jpeg', 'png']);

                if ((empty($reward['pdf_template']) && !empty($reward['image_url'])) || $isImageTemplate) {
                    $sourceFile = $isImageTemplate ? $reward['pdf_template'] : $reward['image_url'];
                    $pdfUrl      = base_url('uploads/rewards/' . $sourceFile);
                    $redemptionModel->update($redemptionId, ['pdf_path' => $sourceFile]);
                } else {
                    $pdfUrl = $this->generateAndSavePdf($user, $reward, $redemptionId, $codesList); 
                    if ($pdfUrl) {
                        $filename = basename($pdfUrl);
                        $redemptionModel->update($redemptionId, ['pdf_path' => $filename]);
                    }
                }
            }

            $logModel->save([
                'ip_address' => $this->request->getIPAddress(),
                'user_id'    => $userId,
                'action'     => 'success_reward_redemption',
                'details'    => "Reward ID: {$rewardId} ({$reward['title']})"
            ]);

            $db->transComplete();

            if ($db->transStatus() === false) {
                $error = $db->error();
                throw new \Exception("Database transaction failed: " . ($error['message'] ?? 'Unknown error'));
            }

            return $this->respond([
                'status'  => 'success',
                'message' => '¡Canje exitoso!',
                'pdf_url' => $pdfUrl,
                'code'    => $finalCodeString
            ]);

        } catch (\Exception $e) {
            if ($db->transEnabled()) $db->transRollback();
            log_message('error', "Redemption Exception: " . $e->getMessage());
            return $this->respond(['message' => 'Error al procesar el canje: ' . $e->getMessage()], 400);
        }
    }

    private function generateAndSavePdf($user, $reward, $redemptionId, $codes)
    {
        try {
            if (empty($reward['pdf_template'])) return null;

            $templatePath = FCPATH . 'uploads/templates/' . $reward['pdf_template'];
            if (!file_exists($templatePath)) {
                log_message('error', "PDF Template NOT FOUND: " . $templatePath);
                return null;
            }

            $filename   = 'tec_reward_' . $redemptionId . '_' . time() . '.pdf';
            $outputPath = FCPATH . 'uploads/redeemed/' . $filename;

            if (!is_dir(dirname($outputPath))) {
                mkdir(dirname($outputPath), 0777, true);
            }

            $pdf = new Fpdi();
            $pdf->setSourceFile($templatePath);
            $tplIdx = $pdf->importPage(1);
            $size   = $pdf->getTemplateSize($tplIdx);
            $pdf->AddPage($size['orientation'], [$size['width'], $size['height']]);
            $pdf->useTemplate($tplIdx);

            // Use the 'coordinates' field (percentage-based, semicolon separated)
            // Format: "x%,y%,width%,height%,fontSize;..."
            $coordinatesRaw = $reward['coordinates'] ?? $reward['code_areas'] ?? '';
            if (!is_array($codes)) $codes = explode(',', $codes);

            if (!empty($coordinatesRaw) && strpos($coordinatesRaw, ',') !== false) {
                // Percentage-based coordinate format
                // Font size stored in pt as seen on a 96-DPI screen.
                // FPDI renders at 72 DPI, so scale up by 96/72 ≈ 1.333 to match the admin preview.
                $dpiScale = 96 / 72;
                $areas = explode(';', $coordinatesRaw);
                foreach ($areas as $index => $areaStr) {
                    $currentCode = $codes[$index] ?? $codes[0];
                    $parts = explode(',', trim($areaStr));
                    if (count($parts) >= 4) {
                        $x  = (floatval($parts[0]) / 100) * $size['width'];
                        $y  = (floatval($parts[1]) / 100) * $size['height'];
                        $w  = (floatval($parts[2]) / 100) * $size['width'];
                        $h  = (floatval($parts[3]) / 100) * $size['height'];
                        $fs = isset($parts[4]) ? round(intval($parts[4]) * $dpiScale) : 19;
                        $pdf->SetFont('Arial', 'B', $fs);
                        $pdf->SetXY($x, $y);
                        if ($w > 0 && $h > 0) {
                            $pdf->Cell($w, $h, $currentCode, 0, 0, 'C');
                        } else {
                            $pdf->Text($x, $y, $currentCode);
                        }
                    }
                }
            }

            $pdf->Output($outputPath, 'F');
            log_message('info', "PDF generated OK: " . $outputPath);
            return base_url('uploads/redeemed/' . $filename);

        } catch (\Exception $e) {
            log_message('error', "PDF Generation Error: " . $e->getMessage());
            return null;
        }
    }

    public function history()
    {
        $userId          = $this->request->user->id ?? $this->request->user->uid ?? null;
        $redemptionModel = new RedemptionModel();

        $history = $redemptionModel->select('redemptions.*, rewards.title as reward_title, rewards.image_url')
            ->join('rewards', 'rewards.id = redemptions.reward_id')
            ->where('user_id', $userId)
            ->orderBy('created_at', 'DESC')
            ->findAll();

        return $this->respond($history);
    }

    public function rewardsHistory($userId = null)
    {
        $redemptionModel = new \App\Models\RedemptionModel();
        $history         = $redemptionModel->select('redemptions.*, rewards.title, rewards.image_url, rewards.cost, rewards.type')
            ->join('rewards', 'rewards.id = redemptions.reward_id')
            ->where('user_id', $userId)
            ->orderBy('redemptions.created_at', 'DESC')
            ->findAll();

        return $this->respond($history);
    }
}
