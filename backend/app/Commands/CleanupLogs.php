<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

class CleanupLogs extends BaseCommand
{
    protected $group       = 'Promocion';
    protected $name        = 'promo:cleanup-logs';
    protected $description = 'Limpia duplicados de los logs de la campaña Correo 1.';

    public function run(array $params)
    {
        $db = \Config\Database::connect();

        // 1. Get counts before cleanup
        $total_before = $db->table('email_campaign_logs')
                          ->like('campaign_type', 'Correo 1', 'after')
                          ->countAllResults();
        
        $unique_res = $db->query("SELECT count(DISTINCT email) as unique_users FROM email_campaign_logs WHERE campaign_type LIKE 'Correo 1%'")->getRow();
        $unique_before = $unique_res->unique_users;
        $duplicates = $total_before - $unique_before;

        CLI::write("Total de registros antes: " . $total_before, "yellow");
        CLI::write("Usuarios únicos alcanzados: " . $unique_before, "green");
        CLI::write("Duplicados detectados: " . $duplicates, "red");

        // 2. Delete duplicates
        $sql = "DELETE t1 FROM email_campaign_logs t1
                INNER JOIN email_campaign_logs t2 
                WHERE t1.id > t2.id 
                AND t1.email = t2.email 
                AND t1.campaign_type = t2.campaign_type
                AND t1.campaign_type LIKE 'Correo 1%'";
        
        $db->query($sql);
        $deleted = $db->affectedRows();

        CLI::write("Registros duplicados eliminados: " . $deleted, "green");

        $newLimit = 12480 - $total_before;
        CLI::write("NUEVO LÍMITE RECOMENDADO: " . $newLimit, "cyan");
        CLI::write("Este límite asegura que el total de CORREOS ENVIADOS hoy no exceda los 12,480.", "white");
    }
}
