<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use App\Libraries\EmailSender;
use App\Models\EmailCampaignLogModel;
use App\Models\UserModel;

class SendPromoEmails extends BaseCommand
{
    protected $group       = 'Promocion';
    protected $name        = 'email:send-promo';
    protected $description = 'Envia correos promocionales masivos programados.';
    protected $usage       = 'email:send-promo --mode [test|mass] --type [high|low] --test [email] --delay [ms] --force';
    protected $arguments   = [];
    protected $options     = [
        '--mode'    => 'test (default) o mass (envio a base de datos)',
        '--type'    => 'Solo para modo test: high o low',
        '--test'    => 'Solo para modo test: direccion de correo',
        '--dry-run' => 'Simular envio sin mandar correos',
        '--summary' => 'Solo mostrar conteo de usuarios por segmento',
        '--delay'   => 'Pausa en milisegundos entre correos (default: 100)',
        '--limit'   => 'Límite de correos a procesar (para pruebas)',
        '--force'   => 'Ignorar validación de fecha programada (1 de Abril 17:00)'
    ];

    public function run(array $params)
    {
        $mode    = CLI::getOption('mode') ?? 'test';
        $dryRun  = CLI::getOption('dry-run');
        $summary = CLI::getOption('summary');
        $delay   = (int) (CLI::getOption('delay') ?? 100);
        $limit   = (int) (CLI::getOption('limit') ?? 0);
        $force   = CLI::getOption('force');

        if ($mode === 'test') {
            $this->handleTestMode($params);
            return;
        }

        if ($mode === 'mass') {
            // 🛡️ VALIDACIÓN DE SEGURIDAD: FECHA PROGRAMADA
            // Programado para: Miércoles 1 de Abril, 17:00 CDMX
            $scheduledDate = '2026-04-01 17:00:00';
            $now = date('Y-m-d H:i:s');

            if ($now < $scheduledDate && !$force && !$summary) {
                CLI::error("ERROR DE SEGURIDAD: El envío masivo está programado para el $scheduledDate.");
                CLI::write("Hora actual: $now");
                CLI::write("Si deseas probarlo ahora mismo, usa el flag --test o --force.");
                return;
            }

            $this->handleMassMode($dryRun, $summary, $delay, $limit);
        }
    }

    private function handleTestMode($params)
    {
        $type = CLI::getOption('type');
        $test = CLI::getOption('test');

        if (!$type || !$test) {
            CLI::error("ERROR: En modo test debes especificar --type [high|low] y --test [email]");
            return;
        }

        $emailData = $this->getEmailContent($type);
        
        CLI::write("Enviando prueba ($type) a: $test");
        $success = EmailSender::sendEmail($test, $emailData['subject'], $emailData['title'], $emailData['message'], "VISITAR SITIO", "https://takisaficionintensa.com.mx");

        if ($success) {
            CLI::write(CLI::color("✅ Correo enviado con éxito.", "green"));
            $this->logEmail($test, $type);
        } else {
            CLI::error("❌ Error al enviar el correo.");
        }
    }

    private function handleMassMode($dryRun = false, $summary = false, $delay = 100, $limit = 0)
    {
        $userModel = new UserModel();
        
        $lowCount  = $userModel->where('points >=', 0)->where('points <=', 100)->where('is_blocked', 0)->countAllResults();

        CLI::write("--- RESUMEN DE SEGMENTOS ---");
        CLI::write("Usuarios Segmento Bajo (0-100 pts): " . CLI::color($lowCount, "yellow"));
        CLI::write("Total de envíos disponibles: " . CLI::color($lowCount, "green"));
        
        if ($summary) {
            return;
        }

        $lowUsers = $userModel->where('points >=', 0)
                              ->where('points <=', 100)
                              ->where('is_blocked', 0)
                              ->findAll($limit > 0 ? $limit : 0);

        CLI::write("--- INICIO DE PROCESAMIENTO MASIVO ---");
        
        if ($dryRun) {
            CLI::write(CLI::color("⚠️ MODO DRY-RUN: Simulación activa. No se enviarán correos reales.", "yellow"));
        }

        $totalSent = 0;

        foreach ($lowUsers as $user) {
            if ($this->processSend($user['email'], 'low', $dryRun, $user['id'] ?? null)) {
                $totalSent++;
                if (!$dryRun && $delay > 0) usleep($delay * 1000);
            }
        }

        CLI::write("--- FIN DEL PROCESO ---");
        CLI::write("Total registros procesados: " . $totalSent);
    }

    private function processSend($email, $type, $dryRun, $userId = null)
    {
        $emailData = $this->getEmailContent($type);
        
        if ($dryRun) {
            CLI::write("DRY-RUN: Enviaría '$type' a $email");
            return true;
        }

        $success = EmailSender::sendEmail($email, $emailData['subject'], $emailData['title'], $emailData['message'], "VISITAR SITIO", "https://takisaficionintensa.com.mx");
        
        if ($success) {
            $this->logEmail($email, $type, $userId);
            return true;
        }
        
        return false;
    }

    private function getEmailContent($type)
    {
        if ($type === 'low') {
            return [
                'subject' => "¡Ya eres parte de la afición más intensa! ¡Registra y obtén puntos dobles !",
                'title'   => "¡APROVECHA LOS PUNTOS DOBLES!",
                'message' => "Cada punto que acumulas te da mejores premios y más emoción.<br><br>¡Aprovecha que el 3 y 4 de abril los códigos que registres valen el doble!<br><br>Recuerda que la promoción termina el 30 de abril. Sigue acumulando y demostrando que eres parte de La Afición Más Intensa."
            ];
        }

        // Segmento High (Inactivo por ahora)
        return [
            'subject' => "",
            'title'   => "",
            'message' => ""
        ];
    }

    private function logEmail($email, $type, $userId = null)
    {
        // 1. JSON LOG (FALLBACK)
        try {
            $logFile = WRITEPATH . 'logs/email_campaigns.json';
            $logData = [];
            if (file_exists($logFile)) {
                $logData = json_decode(file_get_contents($logFile), true) ?? [];
            }
            $logData[] = [
                'email'         => $email,
                'campaign_type' => $type,
                'sent_at'       => date('Y-m-d H:i:s'),
                'ip'            => 'SERVER_CLI'
            ];
            file_put_contents($logFile, json_encode($logData, JSON_PRETTY_PRINT));
        } catch (\Exception $e) {}

        // 2. DATABASE LOG (MAIN)
        try {
            $model = new EmailCampaignLogModel();
            $model->insert([
                'user_id'       => $userId,
                'email'         => $email,
                'campaign_type' => $type,
                'sent_at'       => date('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {}
    }
}
