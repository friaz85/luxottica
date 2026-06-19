<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use App\Libraries\EmailSender;
use App\Models\EmailCampaignLogModel;
use App\Models\UserModel;

class SendSprintPromoEmails extends BaseCommand
{
    protected $group       = 'Promocion';
    protected $name        = 'email:send-sprint';
    protected $description = 'Envia los 4 correos de sprint (Takis Afición Intensa) con segmentación específica.';
    protected $usage       = 'email:send-sprint --email [1|2|3|4] --mode [test|mass] --test [email] --delay [ms]';
    protected $arguments   = [];
    protected $options     = [
        '--email'   => 'Número de correo (1, 2, 3 o 4)',
        '--mode'    => 'test (default) o mass (envio real)',
        '--test'    => 'Dirección de correo para modo test',
        '--dry-run' => 'Simular el envío sin mandar correos',
        '--summary' => 'Mostrar conteo de usuarios por segmento solamente',
        '--delay'   => 'Pausa en ms entre correos (default: 100)',
        '--limit'   => 'Límite total (default 12,490)'
    ];

    public function run(array $params)
    {
        $emailNum = CLI::getOption('email');
        $mode     = CLI::getOption('mode') ?? 'test';
        $dryRun   = CLI::getOption('dry-run');
        $summary  = CLI::getOption('summary');
        $delay    = (int) (CLI::getOption('delay') ?? 100);
        $limit    = (int) (CLI::getOption('limit') ?? 11912);

        if (!$emailNum || !in_array($emailNum, [1, 2, 3, 4])) {
            CLI::error("ERROR: Debes especificar --email [1|2|3|4]");
            return;
        }

        if ($mode === 'test') {
            $this->handleTestMode($emailNum);
            return;
        }

        if ($mode === 'mass') {
            $this->handleMassMode($emailNum, $dryRun, $summary, $delay, $limit);
        }
    }

    private function handleTestMode($emailNum)
    {
        $testEmail = CLI::getOption('test');
        if (!$testEmail) {
            CLI::error("ERROR: En modo test debes especificar --test [direccion@correo.com]");
            return;
        }

        $content = $this->getEmailContent($emailNum);
        CLI::write("Enviando PRUEBA de Correo $emailNum a: $testEmail", "yellow");
        
        $success = EmailSender::sendPromotionalEmail($testEmail, $content['subject'], 'Takis Afición Intensa', $content['body'], "PARTICIPAR", "https://takisaficionintensa.com.mx");

        if ($success) {
            // Try to find user_id for logging, if not found use null
            $db = \Config\Database::connect();
            $user = $db->table('users')->where('email', $testEmail)->get()->getRow();
            $userId = $user ? $user->id : null;

            $this->logCampaign($userId, $testEmail, "Correo $emailNum - TEST");
            
            CLI::write("✅ Correo enviado con éxito.", "green");
        } else {
            CLI::error("❌ Error al enviar el correo. Revisa logs de PHP/CodeIgniter.");
        }
    }

    private function handleMassMode($emailNum, $dryRun = false, $summary = false, $delay = 100, $limit = 11912)
    {
        $db = \Config\Database::connect();

        // Optimized Query: Segment A (Priority 1) then Segment B (Priority 2) up to $limit
        $mainQuery = "
            SELECT * FROM (
                (SELECT id, email, full_name, points, 'A' as segment, 1 as priority
                 FROM users 
                 WHERE points >= 5 AND is_blocked = 0)
                UNION ALL
                (SELECT u.id, u.email, u.full_name, u.points, 'B' as segment, 2 as priority
                 FROM users u
                 WHERE u.points > 0 AND u.points < 5 AND u.is_blocked = 0
                 AND EXISTS (
                     SELECT 1 FROM site_visits v 
                     WHERE v.user_id = u.id 
                     AND v.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
                 ))
            ) AS combined
            ORDER BY priority ASC
            LIMIT $limit
        ";

        $allUsers = $db->query($mainQuery)->getResultArray();
        
        $countA = 0;
        $countB = 0;
        foreach ($allUsers as $u) {
            if ($u['segment'] === 'A') $countA++;
            else $countB++;
        }

        CLI::write("--- RESUMEN DE SEGMENTOS ---", "cyan");
        CLI::write("Segmento A (5+ pts): " . CLI::color($countA, "green"));
        CLI::write("Segmento B (1-4 pts + Actividad): " . CLI::color($countB, "green"));
        CLI::write("Total a procesar: " . ($countA + $countB));
        CLI::write("Límite de este Sprint: " . CLI::color($limit, "yellow"));

        if ($summary) return;

        CLI::write("--- INICIO DE ENVÍO MASIVO (Correo $emailNum) ---", "cyan");
        if ($dryRun) CLI::write("⚠️ MODO DRY-RUN ACTIVO", "yellow");

        $totalSent = 0;
        foreach ($allUsers as $user) {
            $content = $this->getEmailContent($emailNum);
            $campaignLabel = "Correo $emailNum - Segmento " . $user['segment'];
            
            // Check if already sent in this campaign
            $alreadySent = $db->table('email_campaign_logs')
                             ->where('email', $user['email'])
                             ->where('campaign_type', $campaignLabel)
                             ->countAllResults();

            if ($alreadySent > 0) {
                continue; // Skip if already logged as sent
            }

            if ($dryRun) {
                CLI::write("Simulando envío [$campaignLabel] a: " . $user['email']);
                $totalSent++;
                continue;
            }

            $success = EmailSender::sendPromotionalEmail($user['email'], $content['subject'], 'Takis Afición Intensa', $content['body'], "PARTICIPAR", "https://takisaficionintensa.com.mx");
            
            if ($success) {
                $this->logCampaign($user['id'], $user['email'], $campaignLabel);
                $totalSent++;
                if ($delay > 0) usleep($delay * 1000);
            } else {
                CLI::error("Error enviando a: " . $user['email']);
            }
        }

        CLI::write("--- PROCESO COMPLETADO ---", "green");
        CLI::write("Total enviados/procesados: $totalSent");
    }

    private function getEmailContent($num)
    {
        $templates = [
            1 => [
                'subject' => "Takis Afición Intensa - Aún tienes tiempo de ganar",
                'body'    => "Recuerda que la promoción de la Afición más Intensa termina este 30 de abril. Todavía estás a tiempo de registrar tus códigos y canjear tus puntos acumulados por increíbles premios antes de que se agoten. Sigue participando y no dejes pasar la oportunidad."
            ],
            2 => [
                'subject' => "Takis Afición Intensa - No te quedes sin recompensas",
                'body'    => "¡Faltan pocos días para que termine la promoción! ¡Recuerda que aún puedes seguir registrando tus códigos y canjeando tus puntos por increíbles premios!"
            ],
            3 => [
                'subject' => "Takis Afición Intensa - Últimos días para canjear tus puntos",
                'body'    => "La promo de la Afición más Intensa está en sus últimos días. Tienes hasta el 30 de abril para registrar los códigos que te falten y aprovechar tus puntos para llevarte increíbles premios. ¡Entra ahora y canjea!"
            ],
            4 => [
                'subject' => "Takis Afición Intensa - Último día para canjear tus puntos",
                'body'    => "Hoy es tu última oportunidad para participar en la Afición más Intensa. Registra los códigos que te queden y canjea todos tus puntos antes de que termine el día. Gracias por participar y te invitamos a conocer a los Golácticos en www.golacticosbarcel.com"
            ]
        ];

        return $templates[$num];
    }

    private function logCampaign($userId, $email, $type)
    {
        try {
            $model = new EmailCampaignLogModel();
            $model->insert([
                'user_id'       => $userId,
                'email'         => $email,
                'campaign_type' => $type,
                'sent_at'       => date('Y-m-d H:i:s')
            ]);
        } catch (\Exception $e) {
            log_message('error', "Error logging campaign: " . $e->getMessage());
        }
    }
}
