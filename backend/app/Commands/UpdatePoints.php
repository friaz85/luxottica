<?php

namespace App\Commands;

use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;
use App\Models\PromoCodeModel;

class UpdatePoints extends BaseCommand
{
    /**
     * The Command's Group
     *
     * @var string
     */
    protected $group = 'Promo';

    /**
     * The Command's Name
     *
     * @var string
     */
    protected $name = 'promo:update-points';

    /**
     * The Command's Description
     *
     * @var string
     */
    protected $description = 'Updates points in promo_codes table for all unused codes.';

    /**
     * The Command's Usage
     *
     * @var string
     */
    protected $usage = 'promo:update-points [points]';

    /**
     * The Command's Arguments
     *
     * @var array
     */
    protected $arguments = [
        'points' => 'The new points value (e.g., 2 or 1)',
    ];

    /**
     * The Command's Options
     *
     * @var array
     */
    protected $options = [];

    /**
     * Actually execute a command.
     *
     * @param array $params
     */
    public function run(array $params)
    {
        $points = $params[0] ?? null;

        if ($points === null) {
            CLI::error('Error: Please provide a points value as an argument.');
            CLI::write('Usage: php spark promo:update-points [points]');
            return;
        }

        if (!is_numeric($points)) {
            CLI::error('Error: Points must be a numeric value.');
            return;
        }

        $promoModel = new PromoCodeModel();
        
        // Log entry in CDMX Time
        $timestamp = date('Y-m-d H:i:s');
        CLI::write("[$timestamp] Updating promo_codes: SET points = $points WHERE is_used = 0", 'yellow');

        try {
            // CI4 set() + update()
            $promoModel->where('is_used', 0)
                      ->set(['points' => (int)$points])
                      ->update();
            
            $affectedRows = $promoModel->db->affectedRows();
            
            CLI::write("Success: Points updated to $points for $affectedRows codes.", 'green');
            log_message('info', "Cron Points Update: Points set to $points for $affectedRows codes.");
            
        } catch (\Exception $e) {
            CLI::error('Database Error: ' . $e->getMessage());
            log_message('error', 'Cron Points Update Failed: ' . $e->getMessage());
        }
    }
}
