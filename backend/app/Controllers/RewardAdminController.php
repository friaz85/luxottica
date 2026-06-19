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
        $rewards = $rewardModel->select('rewards.*, vigencias.fecha_inicio, vigencias.fecha_fin')
                               ->join('vigencias', 'vigencias.id = rewards.idVigencia', 'left')
                               ->orderBy('rewards.cost', 'ASC')
                               ->findAll();
        return $this->respond($rewards);
    }

    public function publicCatalog()
    {
        $user = $this->request->user ?? null;
        $rewardModel = new RewardModel();
        
        $now = date('Y-m-d H:i:s');
        $query = $rewardModel->select('rewards.*, vigencias.fecha_inicio, vigencias.fecha_fin')
                             ->join('vigencias', 'vigencias.id = rewards.idVigencia', 'left')
                             ->where('rewards.active', 1)
                             ->where('rewards.stock >', 0)
                             ->groupStart()
                                 ->where('rewards.idVigencia IS NULL')
                                 ->orGroupStart()
                                     ->where('vigencias.fecha_inicio <=', $now)
                                     ->where('vigencias.fecha_fin >=', $now)
                                 ->groupEnd()
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
        
        return $this->respond($query->orderBy('rewards.cost', 'ASC')->findAll());
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
            'font_size'    => $data['font_size'] ?? 12,
            'idVigencia'   => !empty($data['idVigencia']) ? $data['idVigencia'] : null,
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
                
                // Handle Exit Codes and Update Stock
                if (!empty($data['exit_codes'])) {
                    $addedCount = $this->processExitCodes($rewardId, $data['exit_codes']);
                    $rewardModel->update($rewardId, ['stock' => $addedCount]);
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
            if ($rewardModel->update($id, $updateData)) {
                if (isset($data['exit_codes'])) {
                    $this->processExitCodes($id, $data['exit_codes'], true);
                    // Recalculate stock after codes update
                    $rewardCodeModel = new RewardCodeModel();
                    $newStock = $rewardCodeModel->where('reward_id', $id)->where('is_used', 0)->countAllResults();
                    $rewardModel->update($id, ['stock' => $newStock]);
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

    private function processExitCodes($rewardId, $codesText, $clearOld = false)
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
                'reward_id' => $rewardId,
                'is_used'   => 0
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
        $rewardCodeModel = new RewardCodeModel();

        if (!is_array($rows)) return $this->fail('Formato de códigos inválido.');

        $successCount = 0;
        $duplicates   = [];

        foreach ($rows as $rowData) {
            $saveData = [
                'reward_id' => $rewardId,
                'is_used'   => false
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
