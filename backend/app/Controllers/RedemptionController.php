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
    // Taecel API credentials (from .env)
    private string $taecelKey;
    private string $taecelNip;

    public function __construct()
    {
        $this->taecelKey = env('TAECEL_KEY', '');
        $this->taecelNip = env('TAECEL_NIP', '');
    }

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
        $rewardId        = (int)($this->request->getVar('reward_id') ?? 0);
        // Separate fields (replaces JSON extra_data)
        $nombreMonedero  = trim($this->request->getVar('nombre_monedero')  ?? '');
        $apellidoPaterno = trim($this->request->getVar('apellido_paterno') ?? '');
        $apellidoMaterno = trim($this->request->getVar('apellido_materno') ?? '');
        $telefonoRecarga = trim($this->request->getVar('telefono_recarga') ?? '');
        $idTelefonia     = (int)($this->request->getVar('id_telefonia') ?? 0);

        log_message('error', "Redemption attempt: User ID {$userId}, Reward ID (int): {$rewardId}");

        $user = $userModel->find($userId);

        if ($user && isset($user['is_blocked']) && (int) $user['is_blocked'] === 1) {
            return $this->fail('Tu cuenta ha sido bloqueada. No puedes realizar esta accion.', 403);
        }

        $pin = $this->request->getVar('pin');
        if (empty($pin)) {
            return $this->respond(['message' => 'El PIN de seguridad es requerido.'], 400);
        }
        if (empty($user['pin']) || !password_verify($pin, $user['pin'])) {
            return $this->respond(['message' => 'El PIN de seguridad es incorrecto.'], 400);
        }

        // Check Project Expiration
        if (isset($user['id_proyecto'])) {
            $proyectoModel = new \App\Models\ProyectoModel();
            if (!$proyectoModel->isProjectActive($user['id_proyecto'])) {
                return $this->fail('La vigencia de su participaci\u00f3n ha finalizado. Ya no es posible realizar canjes.', 403);
            }
        }

        $reward = $rewardModel->find($rewardId);

        if (!$reward) {
            log_message('error', "Reward not found for id={$rewardId}");
            return $this->respond(['message' => 'Recompensa no encontrada.'], 400);
        }

        $tipoCheck = $reward['tipo_recompensa'] ?? 'normal';
        $isManual  = in_array($tipoCheck, ['monedero', 'tiempo_aire']);
        log_message('error', "Reward found: id={$rewardId} tipo={$tipoCheck} stock={$reward['stock']} isManual=" . ($isManual ? 'YES' : 'NO'));

        // Only check stock for non-manual reward types
        if (!$isManual && $reward['stock'] <= 0) {
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
                // Find a code where the associated validity (if any) complies with the +56 days rule, or has no validity limit.
                $nowStr = date('Y-m-d H:i:s');
                $limitDateStr = date('Y-m-d H:i:s', strtotime('+56 days'));
                $availableRow = $rewardCodeModel->select('reward_codes.*')
                    ->join('vigencias', 'vigencias.id = reward_codes.id_vigencia', 'left')
                    ->where('reward_codes.reward_id', $rewardId)
                    ->where('reward_codes.is_used', 0)
                    ->where('reward_codes.is_deleted', 0)
                    ->groupStart()
                        ->where('reward_codes.id_vigencia IS NULL')
                        ->orGroupStart()
                            ->where('vigencias.fecha_inicio <=', $nowStr)
                            ->where('vigencias.fecha_fin >=', $limitDateStr)
                        ->groupEnd()
                    ->groupEnd()
                    ->orderBy('reward_codes.id', 'ASC')
                    ->first();

                if (!$availableRow) {
                    $db->transRollback();
                    return $this->respond(['message' => 'Lo sentimos, no hay suficientes códigos disponibles que cumplan con el periodo mínimo de validez de 56 días para esta recompensa.'], 400);
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

            // Calculate coupon validity dates (today + 56 days) if associated with a vigencia
            $fechaValidezInicio = null;
            $fechaValidezFin = null;
            if ($hasInventory && $availableRow && !empty($availableRow['id_vigencia'])) {
                $fechaValidezInicio = date('Y-m-d');
                $startDate = new \DateTime($fechaValidezInicio);
                $startDate->modify('+56 days');
                $fechaValidezFin = $startDate->format('Y-m-d');
            }

            // Deduct Points
            $newPoints = $user['points'] - $reward['cost'];
            $newUsed = ($user['points_used'] ?? 0) + $reward['cost'];
            if (!$userModel->update($userId, [
                'points'           => $newPoints,
                'points_used'      => $newUsed,
                'points_remaining' => $newPoints
            ])) {
                throw new \Exception("Error updating user points fields: " . json_encode($userModel->errors()));
            }

            // Only decrement stock for normal rewards (not monedero/tiempo_aire which have no inventory)
            $tipoRecompensa = $reward['tipo_recompensa'] ?? 'normal';
            if (!in_array($tipoRecompensa, ['monedero', 'tiempo_aire'])) {
                $newStock = (int)$reward['stock'] - 1;
                if (!$rewardModel->update($rewardId, ['stock' => $newStock])) {
                    throw new \Exception("Error updating reward stock: " . json_encode($rewardModel->errors()));
                }
            }

            $finalCodeString = implode(',', $codesList);

            $redemptionData = [
                'user_id'              => $userId,
                'reward_id'            => $rewardId,
                'status'               => ($tipoRecompensa === 'monedero') ? 'pending' : (($reward['type'] === 'digital') ? 'completed' : 'pending'),
                'digital_code'         => $finalCodeString,
                'extra_data'           => null, // deprecated, kept for compatibility
                'nombre_monedero'      => ($tipoRecompensa === 'monedero')   ? $nombreMonedero  : null,
                'apellido_paterno'     => ($tipoRecompensa === 'monedero')   ? $apellidoPaterno : null,
                'apellido_materno'     => ($tipoRecompensa === 'monedero')   ? $apellidoMaterno : null,
                'telefono_recarga'     => ($tipoRecompensa === 'tiempo_aire') ? $telefonoRecarga : null,
                'id_telefonia'         => ($tipoRecompensa === 'tiempo_aire') ? $idTelefonia     : null,
                'status_recarga'       => ($tipoRecompensa === 'tiempo_aire') ? 'pending' : null,
                'fecha_validez_inicio' => $fechaValidezInicio,
                'fecha_validez_fin'    => $fechaValidezFin,
                'ip_address'           => $this->request->getIPAddress(),
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
                    $pdfUrl = $this->generateAndSavePdf($user, $reward, $redemptionId, $codesList, $fechaValidezInicio, $fechaValidezFin); 
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

            // --- Tiempo Aire: call Taecel after transaction committed ---
            if ($tipoRecompensa === 'tiempo_aire') {
                $telefoniaRow = $db->table('tblTelefonia')
                    ->where('idTelefonia', $idTelefonia)
                    ->get()->getRowArray();
                return $this->processAirtime($db, $redemptionId, $reward, $telefonoRecarga, $idTelefonia, $telefoniaRow, $logModel, $userId);
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

    /**
     * processAirtime — Calls Taecel API to process tiempo_aire recharge.
     * Called AFTER the redemption record and points deduction are committed.
     * The user always sees success; real result is stored internally.
     */
    private function processAirtime($db, int $redemptionId, array $reward, string $telefono, int $idTelefonia, ?array $telefoniaRow, $logModel, int $userId): \CodeIgniter\HTTP\ResponseInterface
    {
        $redemptionModel = new RedemptionModel();

        if (!$telefoniaRow) {
            log_message('error', "processAirtime: telefonia id={$idTelefonia} not found");
            $redemptionModel->update($redemptionId, ['status_recarga' => 'error', 'status' => 'completed']);
            return $this->respond([
                'status'  => 'success',
                'message' => '¡Tu recarga ha sido procesada! En un lapso de 24 a 48 horas verás reflejado tu saldo. 📱',
            ]);
        }

        // Producto: SKU + monto con 3 dígitos (ej: TEL010, MOV100)
        $monto   = str_pad((string)(int)($reward['monto_recarga'] ?? 0), 3, '0', STR_PAD_LEFT);
        $producto = $telefoniaRow['SKU'] . $monto;

        log_message('info', "Taecel: producto={$producto} referencia={$telefono} redemptionId={$redemptionId}");

        // --- Step 1: RequestTXN ---
        $txnResponse = $this->taecelRequest('RequestTXN', [
            'key'        => $this->taecelKey,
            'nip'        => $this->taecelNip,
            'producto'   => $producto,
            'referencia' => $telefono,
        ]);
        log_message('info', 'Taecel RequestTXN resp: ' . json_encode($txnResponse));

        $transID         = $txnResponse['data']['transID'] ?? ($txnResponse['transID'] ?? '');
        $recargarExitosa = false;
        $logMensaje      = '';
        $folioRecarga    = '';

        if (!empty($txnResponse['success']) && $txnResponse['success']) {
            // --- Step 2: StatusTXN ---
            $statusResponse = $this->taecelRequest('StatusTXN', [
                'key'     => $this->taecelKey,
                'nip'     => $this->taecelNip,
                'transID' => $transID,
            ]);
            log_message('info', 'Taecel StatusTXN resp: ' . json_encode($statusResponse));

            if (!empty($statusResponse['success']) && $statusResponse['success']) {
                $data          = $statusResponse['data'] ?? $statusResponse;
                $saldoRaw      = $data['Saldo Final'] ?? $data['Saldo'] ?? $data['saldo'] ?? '0';
                $saldo         = preg_replace('/[^0-9.]/', '', str_replace(',', '', $saldoRaw));
                $folioRecarga  = $data['Folio'] ?? $data['folio'] ?? '';
                $logMensaje    = "Recarga exitosa. Folio: {$folioRecarga}. Saldo: {$saldoRaw}";
                $recargarExitosa = true;
            } else {
                $logMensaje = $statusResponse['message'] ?? 'Error al verificar StatusTXN';
            }
        } else {
            $logMensaje = $txnResponse['message'] ?? 'Error en RequestTXN';
        }

        // --- Update redemption with result ---
        $redemptionModel->update($redemptionId, [
            'status'         => 'completed',
            'status_recarga' => $recargarExitosa ? 'success' : 'failed',
            'digital_code'   => $transID ? "TXN:{$transID}" : '',
        ]);

        // --- Log en tblLogRecarga (igual que Postit2026) ---
        try {
            $db->table('tblLogRecarga')->insert([
                'idRegistro'    => $redemptionId,
                'Mensaje'       => $logMensaje ?: ($recargarExitosa ? 'Recarga exitosa' : 'Recarga fallida'),
                'Codigo'        => $recargarExitosa ? '0' : (string)($txnResponse['error'] ?? $statusResponse['error'] ?? 'E'),
                'FechaRegistro' => date('Y-m-d H:i:s'),
            ]);
        } catch (\Exception $e) {
            log_message('error', 'tblLogRecarga insert error: ' . $e->getMessage());
        }

        // --- Log en security_logs ---
        $logModel->save([
            'ip_address' => $this->request->getIPAddress(),
            'user_id'    => $userId,
            'action'     => $recargarExitosa ? 'taecel_recarga_exitosa' : 'taecel_recarga_fallida',
            'details'    => "Producto: {$producto} | Tel: {$telefono} | {$logMensaje}",
        ]);


        // Always return success to user (they should not see Taecel internal errors)
        return $this->respond([
            'status'  => 'success',
            'message' => '¡Tu recarga ha sido procesada! En un lapso de 24 a 48 horas verás reflejado tu saldo. 📱',
        ]);
    }

    /**
     * taecelRequest — HTTP POST to Taecel API endpoint.
     */
    private function taecelRequest(string $endpoint, array $params): array
    {
        $url  = 'https://taecel.com/app/api/' . $endpoint;
        $body = http_build_query($params);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $body,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 30,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/x-www-form-urlencoded'],
        ]);
        $response = curl_exec($ch);
        $error    = curl_error($ch);
        curl_close($ch);

        if ($error) {
            log_message('error', "Taecel cURL error ({$endpoint}): {$error}");
            return ['success' => false, 'message' => $error];
        }

        $decoded = json_decode($response, true);
        if (!is_array($decoded)) {
            log_message('error', "Taecel invalid JSON ({$endpoint}): {$response}");
            return ['success' => false, 'message' => 'Respuesta inválida de Taecel'];
        }

        return $decoded;
    }


    private function generateAndSavePdf($user, $reward, $redemptionId, $codes, $fechaValidezInicio = null, $fechaValidezFin = null)
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

            // Print Coupon Validity Date using vigencia_area position (configured in admin)
            if ($fechaValidezInicio && $fechaValidezFin) {
                $formattedInicio = $this->formatCouponDate($fechaValidezInicio);
                $formattedFin    = $this->formatCouponDate($fechaValidezFin);
                $text = "{$formattedInicio} al {$formattedFin}";

                $vigenciaAreaRaw = $reward['vigencia_area'] ?? '';
                $dpiScale = 96 / 72;

                if (!empty($vigenciaAreaRaw) && strpos($vigenciaAreaRaw, ',') !== false) {
                    // Use configured area position (percentage-based, support multiple areas separated by semicolon)
                    $vAreas = explode(';', $vigenciaAreaRaw);
                    foreach ($vAreas as $vAreaStr) {
                        $vParts = explode(',', trim($vAreaStr));
                        if (count($vParts) >= 4) {
                            $vx = (floatval($vParts[0]) / 100) * $size['width'];
                            $vy = (floatval($vParts[1]) / 100) * $size['height'];
                            $vw = (floatval($vParts[2]) / 100) * $size['width'];
                            $vh = (floatval($vParts[3]) / 100) * $size['height'];
                            $vfs = isset($vParts[4]) ? round(intval($vParts[4]) * $dpiScale) : 12;
                            $pdf->SetFont('Arial', 'B', $vfs);
                            $pdf->SetTextColor(0, 0, 0);
                            $pdf->SetXY($vx, $vy);
                            if ($vw > 0 && $vh > 0) {
                                $pdf->Cell($vw, $vh, $text, 0, 0, 'C');
                            } else {
                                $pdf->Text($vx, $vy, $text);
                            }
                        }
                    }
                } else {
                    // Fallback: centered near the bottom
                    $pdf->SetFont('Arial', 'B', 12);
                    $pdf->SetTextColor(0, 0, 0);
                    $pdf->Text(($size['width'] / 2) - 45, $size['height'] - 12, $text);
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

    private function formatCouponDate($dateStr)
    {
        $timestamp = strtotime($dateStr);
        return date('d/m/Y', $timestamp);
    }

    public function history()
    {
        $userId          = $this->request->user->id ?? $this->request->user->uid ?? null;
        $redemptionModel = new RedemptionModel();

        $history = $redemptionModel->select('redemptions.*, rewards.title as reward_title, rewards.image_url, rewards.cost, rewards.tipo_recompensa')
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
