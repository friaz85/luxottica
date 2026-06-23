<?php

namespace App\Controllers;

use App\Models\RewardModel;
use App\Models\RewardCodeModel;
use CodeIgniter\RESTful\ResourceController;

class RewardAdminController extends ResourceController
{
    public function index()
    {
        $rewardModel = new RewardModel();
        $rewards = $rewardModel->orderBy('cost', 'ASC')->findAll();
        
        $db = \Config\Database::connect();
        foreach ($rewards as &$reward) {
            $reward['vigencias'] = $db->table('reward_codes')
                                     ->select('vigencias.*')
                                     ->join('vigencias', 'vigencias.id = reward_codes.id_vigencia')
                                     ->where('reward_codes.reward_id', $reward['id'])
                                     ->where('reward_codes.is_used', 0)
                                     ->groupBy('vigencias.id')
                                     ->get()
                                     ->getResultArray();
        }
        return $this->respond($rewards);
    }

    public function publicCatalog()
    {
        $user = $this->request->user ?? null;
        $rewardModel = new RewardModel();
        
        $now = date('Y-m-d H:i:s');
        $query = $rewardModel->where('active', 1)
                             ->groupStart()
                                 ->where('stock >', 0)
                                 ->orWhere('tipo_recompensa', 'monedero')
                                 ->orWhere('tipo_recompensa', 'tiempo_aire')
                             ->groupEnd();
        
        if ($user && isset($user->id_proyecto)) {
            $db = \Config\Database::connect();
            $excludedIds = $db->table('reward_exclusions')
                              ->where('id_proyecto', $user->id_proyecto)
                              ->get()
                              ->getResultArray();
            $excludedIds = array_column($excludedIds, 'id_reward');

            $query->groupStart()
                      ->where('rewards.id_proyecto IS NULL')
                      ->orWhere('rewards.id_proyecto', $user->id_proyecto)
                  ->groupEnd();

            if (!empty($excludedIds)) {
                $query->whereNotIn('rewards.id', $excludedIds);
            }
        }
        
        $rewards = $query->orderBy('rewards.cost', 'ASC')->findAll();
        
        $db = \Config\Database::connect();
        $filteredRewards = [];
        
        foreach ($rewards as $reward) {
            $tipo = $reward['tipo_recompensa'] ?? 'normal';
            
            // 1. Monederos and tiempo_aire: no validation, always show.
            if ($tipo === 'monedero' || $tipo === 'tiempo_aire') {
                $reward['vigencias'] = [];
                $filteredRewards[] = $reward;
                continue;
            }
            
            // 2. Normal rewards must have stock > 0
            if ((int)$reward['stock'] <= 0) {
                continue;
            }
            
            // 3. Determine if the reward has validity.
            // Check if there is any active code with validity associated
            $hasVigenciaCodes = $db->table('reward_codes')
                                   ->where('reward_id', $reward['id'])
                                   ->where('is_used', 0)
                                   ->where('id_vigencia IS NOT NULL')
                                   ->countAllResults() > 0;
            
            if ($hasVigenciaCodes) {
                // Look up all vigencias that have at least one active, non-used code
                $vigencias = $db->table('reward_codes')
                                ->select('vigencias.*')
                                ->join('vigencias', 'vigencias.id = reward_codes.id_vigencia')
                                ->where('reward_codes.reward_id', $reward['id'])
                                ->where('reward_codes.is_used', 0)
                                ->groupBy('vigencias.id')
                                ->get()
                                ->getResultArray();
                                
                $validVigencias = [];
                $limitDate = date('Y-m-d H:i:s', strtotime('+56 days'));
                foreach ($vigencias as $v) {
                    if ($v['fecha_inicio'] <= $now && $v['fecha_fin'] >= $limitDate) {
                        $validVigencias[] = $v;
                    }
                }
                
                if (!empty($validVigencias)) {
                    $reward['vigencias'] = $validVigencias;
                    $filteredRewards[] = $reward;
                }
            } else {
                // If it does NOT have validity, it is shown directly because stock > 0.
                $reward['vigencias'] = [];
                $filteredRewards[] = $reward;
            }
        }
        
        return $this->respond($filteredRewards);
    }

    public function createReward()
    {
        $rewardModel = new RewardModel();
        $data        = $this->request->getPost();
        
        $saveData = [
            'id_proyecto'  => !empty($data['id_proyecto']) ? $data['id_proyecto'] : null,
            'title'        => $data['title'] ?? null,
            'description'  => $data['description'] ?? null,
            'type'         => $data['type'] ?? 'digital',
            'cost'         => $data['cost'] ?? 0,
            'stock'        => 0, // Will be updated by processExitCodes
            'active'       => $data['active'] ?? 1,
            'image_url'    => !empty($data['image_url']) ? $data['image_url'] : null,
            'pdf_template' => !empty($data['pdf_template']) ? $data['pdf_template'] : null,
            'codes_count'  => (int)($data['codes_count'] ?? 1),
            'coordinates'  => !empty($data['coordinates']) ? $data['coordinates'] : null,
            'code_areas'   => !empty($data['code_areas']) ? $data['code_areas'] : null,
            'font_size'       => $data['font_size'] ?? 12,
            'idVigencia'      => !empty($data['idVigencia']) ? $data['idVigencia'] : null,
            'tipo_recompensa' => !empty($data['tipo_recompensa']) ? $data['tipo_recompensa'] : 'normal',
            'monto_recarga'   => !empty($data['monto_recarga']) ? (int)$data['monto_recarga'] : 0,
        ];

        // Handle File Uploads
        $img = $this->request->getFile('image');
        if ($img && $img->isValid() && !$img->hasMoved()) {
            $newName = $img->getRandomName();
            $img->move(FCPATH . 'uploads/rewards', $newName);
            $saveData['image_url'] = $newName;
        }

        $pdf = $this->request->getFile('pdf');
        if ($pdf && $pdf->isValid() && !$pdf->hasMoved()) {
            $newName = $pdf->getRandomName();
            $pdf->move(FCPATH . 'uploads/templates', $newName);
            $saveData['pdf_template'] = $newName;
        }

        try {
            if ($rewardModel->insert($saveData)) {
                $rewardId = $rewardModel->insertID();
                
                // Save reward_vigencias
                $idVigencias = $data['id_vigencias'] ?? [];
                if (is_string($idVigencias)) {
                    $decoded = json_decode($idVigencias, true);
                    if (is_array($decoded)) {
                        $idVigencias = $decoded;
                    } else {
                        $idVigencias = array_filter(explode(',', $idVigencias));
                    }
                }
                if (!empty($idVigencias)) {
                    $db = \Config\Database::connect();
                    foreach ($idVigencias as $idVigencia) {
                        $db->table('reward_vigencias')->insert([
                            'id_reward'   => $rewardId,
                            'id_vigencia' => $idVigencia
                        ]);
                    }
                }

                // Handle Exit Codes and Update Stock
                if (!empty($data['exit_codes'])) {
                    $uploadVigenciaId = !empty($data['upload_vigencia_id']) ? $data['upload_vigencia_id'] : null;
                    $addedCount = $this->processExitCodes($rewardId, $data['exit_codes'], false, $uploadVigenciaId);
                    $rewardModel->update($rewardId, ['stock' => $addedCount]);
                }

                // Log reward creation/status
                if (isset($saveData['active'])) {
                    $admin = $this->request->admin_user ?? null;
                    $adminId = $admin->id ?? null;
                    $adminUsername = $admin->username ?? 'Unknown Admin';
                    
                    $statusStr = ((int)$saveData['active'] === 1) ? 'ENCENDIDO' : 'APAGADO';
                    
                    $logModel = new \App\Models\SecurityLogModel();
                    $logModel->save([
                        'ip_address' => $this->request->getIPAddress(),
                        'user_id'    => $adminId,
                        'action'     => 'reward_toggle',
                        'details'    => "El administrador '{$adminUsername}' (ID: {$adminId}) creó la recompensa ID {$rewardId} ('{$saveData['title']}') con estado {$statusStr}."
                    ]);
                }

                return $this->respondCreated(['message' => 'Recompensa creada', 'id' => $rewardId]);
            }
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
        
        return $this->fail($rewardModel->errors());
    }

    public function updateReward($id = null)
    {
        $rewardModel = new RewardModel();
        $data        = $this->request->getPost();

        $updateData = [];
        if (array_key_exists('id_proyecto', $data)) {
            $updateData['id_proyecto'] = !empty($data['id_proyecto']) ? $data['id_proyecto'] : null;
        }
        if (isset($data['title'])) $updateData['title'] = $data['title'];
        if (isset($data['description'])) $updateData['description'] = $data['description'];
        if (isset($data['type'])) $updateData['type'] = $data['type'];
        if (isset($data['cost'])) $updateData['cost'] = $data['cost'];
        if (isset($data['active'])) $updateData['active'] = $data['active'];
        
        if (key_exists('image_url', $data)) $updateData['image_url'] = !empty($data['image_url']) ? $data['image_url'] : null;
        if (key_exists('pdf_template', $data)) $updateData['pdf_template'] = !empty($data['pdf_template']) ? $data['pdf_template'] : null;
        if (isset($data['codes_count'])) $updateData['codes_count'] = (int)$data['codes_count'];
        if (key_exists('coordinates', $data)) $updateData['coordinates'] = !empty($data['coordinates']) ? $data['coordinates'] : null;
        if (key_exists('code_areas', $data)) $updateData['code_areas'] = !empty($data['code_areas']) ? $data['code_areas'] : null;
        if (isset($data['font_size'])) $updateData['font_size'] = $data['font_size'];
        if (key_exists('idVigencia', $data)) $updateData['idVigencia'] = !empty($data['idVigencia']) ? $data['idVigencia'] : null;
        if (isset($data['tipo_recompensa'])) $updateData['tipo_recompensa'] = $data['tipo_recompensa'];
        if (isset($data['monto_recarga'])) $updateData['monto_recarga'] = (int)$data['monto_recarga'];

        // Handle File Uploads
        $img = $this->request->getFile('image');
        if ($img && $img->isValid() && !$img->hasMoved()) {
            $newName = $img->getRandomName();
            $img->move(FCPATH . 'uploads/rewards', $newName);
            $updateData['image_url'] = $newName;
        }

        $pdf = $this->request->getFile('pdf');
        if ($pdf && $pdf->isValid() && !$pdf->hasMoved()) {
            $newName = $pdf->getRandomName();
            $pdf->move(FCPATH . 'uploads/templates', $newName);
            $updateData['pdf_template'] = $newName;
        }

        try {
            $currentReward = $rewardModel->find($id);
            if ($rewardModel->update($id, $updateData)) {
                // Sync reward_vigencias
                if (isset($data['id_vigencias'])) {
                    $idVigencias = $data['id_vigencias'];
                    if (is_string($idVigencias)) {
                        $decoded = json_decode($idVigencias, true);
                        if (is_array($decoded)) {
                            $idVigencias = $decoded;
                        } else {
                            $idVigencias = array_filter(explode(',', $idVigencias));
                        }
                    }
                    $db = \Config\Database::connect();
                    $db->table('reward_vigencias')->where('id_reward', $id)->delete();
                    foreach ($idVigencias as $idVigencia) {
                        $db->table('reward_vigencias')->insert([
                            'id_reward'   => $id,
                            'id_vigencia' => $idVigencia
                        ]);
                    }
                }

                if (!empty($data['exit_codes'])) {
                    $uploadVigenciaId = !empty($data['upload_vigencia_id']) ? $data['upload_vigencia_id'] : null;
                    $this->processExitCodes($id, $data['exit_codes'], false, $uploadVigenciaId);
                    // Recalculate stock after codes update
                    $rewardCodeModel = new RewardCodeModel();
                    $newStock = $rewardCodeModel->where('reward_id', $id)->where('is_used', 0)->countAllResults();
                    $rewardModel->update($id, ['stock' => $newStock]);
                }

                // Log status toggle
                if ($currentReward && isset($updateData['active'])) {
                    $oldActive = (int)$currentReward['active'];
                    $newActive = (int)$updateData['active'];
                    if ($oldActive !== $newActive) {
                        $admin = $this->request->admin_user ?? null;
                        $adminId = $admin->id ?? null;
                        $adminUsername = $admin->username ?? 'Unknown Admin';
                        
                        $statusStr = $newActive === 1 ? 'ENCENDIDO' : 'APAGADO';
                        
                        $logModel = new \App\Models\SecurityLogModel();
                        $logModel->save([
                            'ip_address' => $this->request->getIPAddress(),
                            'user_id'    => $adminId,
                            'action'     => 'reward_toggle',
                            'details'    => "El administrador '{$adminUsername}' (ID: {$adminId}) cambió el estado de la recompensa ID {$id} ('{$currentReward['title']}') a {$statusStr}."
                        ]);
                    }
                }

                return $this->respond(['message' => 'Recompensa actualizada']);
            }
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
        return $this->fail($rewardModel->errors());
    }

    public function deleteReward($id = null)
    {
        $rewardModel = new RewardModel();
        $rewardCodeModel = new RewardCodeModel();
        $rewardCodeModel->where('reward_id', $id)->delete();
        if ($rewardModel->delete($id)) {
            return $this->respondDeleted(['message' => 'Recompensa eliminada']);
        }
        return $this->fail('Error al eliminar');
    }

    private function processExitCodes($rewardId, $codesText, $clearOld = false, $idVigencia = null)
    {
        $rewardCodeModel = new RewardCodeModel();
        if ($clearOld) {
            $rewardCodeModel->where('reward_id', $rewardId)->where('is_used', 0)->delete();
        }

        $lines = explode("\n", $codesText);
        $added = 0;
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) continue;

            $codes = explode(",", $line);
            $saveData = [
                'reward_id'   => $rewardId,
                'id_vigencia' => !empty($idVigencia) ? $idVigencia : null,
                'is_used'     => 0
            ];

            foreach (array_slice($codes, 0, 8) as $i => $val) {
                $idx = $i + 1;
                $val = trim($val);
                if (empty($val)) continue;
                
                // Global uniqueness check
                $db = \Config\Database::connect();
                $existsInEntry = $db->table('tblCodigoEntrada')->where('codigo', $val)->countAllResults() > 0;
                $existsInReward = $db->table('reward_codes')
                                     ->groupStart()
                                         ->where('code', $val)->orWhere('code1', $val)->orWhere('code2', $val)
                                         ->orWhere('code3', $val)->orWhere('code4', $val)->orWhere('code5', $val)
                                         ->orWhere('code6', $val)->orWhere('code7', $val)->orWhere('code8', $val)
                                     ->groupEnd()
                                     ->countAllResults() > 0;

                if ($existsInEntry || $existsInReward) {
                    continue 2; // Skip this line/set of codes if any part is duplicate
                }

                $saveData["code$idx"] = $val;
                if ($idx === 1) $saveData['code'] = $val;
            }

            if ($rewardCodeModel->insert($saveData)) {
                $added++;
            }
        }
        return $added;
    }

    public function getExclusions($id)
    {
        $db = \Config\Database::connect();
        $exclusions = $db->table('reward_exclusions')
                         ->select('reward_exclusions.*, tblProyecto.Proyecto as project_name')
                         ->join('tblProyecto', 'tblProyecto.idProyecto = reward_exclusions.id_proyecto')
                         ->where('id_reward', $id)
                         ->get()
                         ->getResultArray();
        return $this->respond($exclusions);
    }

    public function addCodes($rewardId)
    {
        $rows            = $this->request->getVar('codes');
        $idVigencia      = $this->request->getVar('id_vigencia');
        $rewardCodeModel = new RewardCodeModel();

        if (!is_array($rows)) return $this->fail('Formato de códigos inválido.');

        $successCount = 0;
        $duplicates   = [];

        foreach ($rows as $rowData) {
            $saveData = [
                'reward_id'   => $rewardId,
                'id_vigencia' => !empty($idVigencia) ? $idVigencia : null,
                'is_used'     => false
            ];
            
            $isDuplicate = false;
            $rowCodesToSave = [];

            if (is_array($rowData)) {
                foreach ($rowData as $i => $val) {
                    $idx = $i + 1;
                    if ($idx <= 8) {
                        $val = trim($val);
                        if (empty($val)) continue;

                        // Global uniqueness check
                        $db = \Config\Database::connect();
                        $existsInEntry = $db->table('tblCodigoEntrada')->where('codigo', $val)->countAllResults() > 0;
                        $existsInReward = $db->table('reward_codes')
                                             ->groupStart()
                                                ->where('code', $val)->orWhere('code1', $val)->orWhere('code2', $val)
                                                ->orWhere('code3', $val)->orWhere('code4', $val)->orWhere('code5', $val)
                                                ->orWhere('code6', $val)->orWhere('code7', $val)->orWhere('code8', $val)
                                             ->groupEnd()
                                             ->countAllResults() > 0;
                        
                        if ($existsInEntry || $existsInReward) {
                            $isDuplicate = true;
                            $duplicates[] = $val;
                            break; 
                        }

                        $rowCodesToSave["code$idx"] = $val;
                        if ($idx === 1) $rowCodesToSave['code'] = $val;
                    }
                }
            } else {
                $val = trim($rowData);
                if (empty($val)) continue;

                // Global uniqueness check
                $db = \Config\Database::connect();
                $existsInEntry = $db->table('tblCodigoEntrada')->where('codigo', $val)->countAllResults() > 0;
                $existsInReward = $db->table('reward_codes')
                                     ->groupStart()
                                        ->where('code', $val)->orWhere('code1', $val)->orWhere('code2', $val)
                                        ->orWhere('code3', $val)->orWhere('code4', $val)->orWhere('code5', $val)
                                        ->orWhere('code6', $val)->orWhere('code7', $val)->orWhere('code8', $val)
                                     ->groupEnd()
                                     ->countAllResults() > 0;

                if ($existsInEntry || $existsInReward) {
                    $isDuplicate = true;
                    $duplicates[] = $val;
                } else {
                    $rowCodesToSave['code']  = $val;
                    $rowCodesToSave['code1'] = $val;
                }
            }

            if (!$isDuplicate && !empty($rowCodesToSave)) {
                $rewardCodeModel->save(array_merge($saveData, $rowCodesToSave));
                $successCount++;
            }
        }

        // Auto-update stock based on added codes
        $newStock = $rewardCodeModel->where('reward_id', $rewardId)->where('is_used', 0)->countAllResults();
        $rewardModel = new RewardModel();
        $rewardModel->update($rewardId, ['stock' => $newStock]);

        return $this->respondCreated([
            'message' => 'Proceso de carga finalizado.',
            'success_count' => $successCount,
            'duplicate_count' => count($duplicates),
            'duplicates' => $duplicates
        ]);
    }

    public function addExclusion($id)
    {
        $id_proyecto = $this->request->getVar('id_proyecto');
        if (!$id_proyecto) return $this->fail('Project ID is required');
        $db = \Config\Database::connect();
        try {
            $db->table('reward_exclusions')->insert(['id_reward' => $id, 'id_proyecto' => $id_proyecto]);
            return $this->respondCreated(['status' => 'Exclusion added']);
        } catch (\Exception $e) {
            return $this->fail($e->getMessage());
        }
    }

    public function removeExclusion($id, $id_proyecto)
    {
        $db = \Config\Database::connect();
        $db->table('reward_exclusions')->where('id_reward', $id)->where('id_proyecto', $id_proyecto)->delete();
        return $this->respond(['status' => 'Exclusion removed']);
    }
}
