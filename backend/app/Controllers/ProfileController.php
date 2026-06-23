<?php

namespace App\Controllers;

use App\Models\UserModel;
use CodeIgniter\RESTful\ResourceController;

class ProfileController extends ResourceController
{
    public function getProfile()
    {
        try {
            $userId = $this->request->user->id ?? $this->request->user->uid ?? null;
            if (!$userId)
                return $this->respond(['status' => 'error', 'message' => 'Token inválido'], 401);

            $userModel = new UserModel();
            $user      = $userModel->find($userId);
            if (!$user)
                return $this->respond(['status' => 'error', 'message' => 'Usuario no encontrado'], 404);

            $user['has_pin'] = !empty($user['pin']);
            unset($user["password_hash"], $user["otp"], $user["otp_expiry"], $user["pin"]);

            // Attach project validity info
            if (!empty($user['id_proyecto'])) {
                $db      = \Config\Database::connect();
                $project = $db->table('tblProyecto')
                              ->where('idProyecto', $user['id_proyecto'])
                              ->get()->getRowArray();
                if ($project) {
                    $user['project_name']    = $project['Proyecto'];
                    $user['project_start']   = $project['Fecha_Inicio'];
                    $user['project_end']     = $project['Fecha_Fin'];
                }
            }

            return $this->respond($user);
        } catch (\Exception $e) {
            return $this->respond(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function getPoints($id = null)
    {
        $userModel = new UserModel();
        $user      = $userModel->find($id);
        if (!$user) {
            return $this->respond(['points' => 0]);
        }
        return $this->respond(['points' => intval($user['points'] ?? 0)]);
    }

    public function updateProfile()
    {
        $rawInput = file_get_contents('php://input');

        try {
            $userId = $this->request->user->id ?? $this->request->user->uid ?? null;
            if (!$userId) {
                return $this->respond(['status' => 'error', 'message' => 'No autorizado'], 401);
            }

            $input = json_decode($rawInput, true);
            if (!$input) {
                $input = $this->request->getVar();
            }

            $userModel = new UserModel();

            $data = [];
            if (isset($input["full_name"]))
                $data["full_name"] = $input["full_name"];
            if (isset($input["recipient_name"]))
                $data["recipient_name"] = $input["recipient_name"];
            if (isset($input["phone"]))
                $data["phone"] = $input["phone"];
            if (isset($input["address"]))
                $data["address"] = $input["address"];
            if (isset($input["numero_exterior"]))
                $data["numero_exterior"] = $input["numero_exterior"];
            if (isset($input["numero_interior"]))
                $data["numero_interior"] = $input["numero_interior"];
            if (isset($input["colonia"]))
                $data["colonia"] = $input["colonia"];
            if (isset($input["municipio"]))
                $data["municipio"] = $input["municipio"];
            if (isset($input["city"]))
                $data["city"] = $input["city"];
            if (isset($input["state"]))
                $data["state"] = $input["state"];
            if (isset($input["zip_code"]))
                $data["zip_code"] = $input["zip_code"];
            if (isset($input["delivery_instructions"]))
                $data["delivery_instructions"] = $input["delivery_instructions"];

            if (empty($data)) {
                return $this->respond(['status' => 'error', 'message' => 'No se recibieron datos para actualizar'], 400);
            }

            if ($userModel->update($userId, $data)) {
                return $this->respond(["status" => "success", "message" => "Perfil actualizado correctamente"]);
            } else {
                $errors = $userModel->errors();
                return $this->respond(['status' => 'error', 'message' => $errors ? implode(', ', $errors) : "Error al actualizar base de datos"], 400);
            }
        } catch (\Exception $e) {
            return $this->respond(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function setPin()
    {
        try {
            $userId = $this->request->user->id ?? $this->request->user->uid ?? null;
            if (!$userId) {
                return $this->respond(['status' => 'error', 'message' => 'No autorizado'], 401);
            }

            $pin = $this->request->getVar('pin');
            if (empty($pin) || !preg_match('/^\d{4}$/', $pin)) {
                return $this->respond(['status' => 'error', 'message' => 'El PIN debe ser de 4 dígitos'], 400);
            }

            $userModel = new UserModel();
            $pinHash = password_hash($pin, PASSWORD_BCRYPT);

            if ($userModel->update($userId, ['pin' => $pinHash])) {
                return $this->respond(['status' => 'success', 'message' => 'PIN guardado correctamente']);
            } else {
                return $this->respond(['status' => 'error', 'message' => 'Error al guardar el PIN'], 500);
            }
        } catch (\Exception $e) {
            return $this->respond(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function verifyPin()
    {
        try {
            $userId = $this->request->user->id ?? $this->request->user->uid ?? null;
            if (!$userId) {
                return $this->respond(['status' => 'error', 'message' => 'No autorizado'], 401);
            }

            $pin = $this->request->getVar('pin');
            if (empty($pin)) {
                return $this->respond(['status' => 'error', 'message' => 'PIN requerido'], 400);
            }

            $userModel = new UserModel();
            $user = $userModel->find($userId);
            if (!$user) {
                return $this->respond(['status' => 'error', 'message' => 'Usuario no encontrado'], 404);
            }

            if (empty($user['pin'])) {
                return $this->respond(['status' => 'error', 'message' => 'No has configurado un PIN de seguridad'], 400);
            }

            if (password_verify($pin, $user['pin'])) {
                return $this->respond(['status' => 'success', 'message' => 'PIN verificado']);
            } else {
                return $this->respond(['status' => 'error', 'message' => 'El PIN es incorrecto'], 400);
            }
        } catch (\Exception $e) {
            return $this->respond(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }
}
