<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use App\Models\UserModel;
use App\Models\RedemptionModel;
use App\Models\RewardModel;

class DashboardAdminController extends ResourceController
{
    public function getStats()
    {
        try {
            $db = \Config\Database::connect();
            $startDate = $this->request->getGet('start_date');
            $endDate   = $this->request->getGet('end_date');

            // Format dates
            $start = $startDate ? $startDate . ' 00:00:00' : null;
            $end   = $endDate ? $endDate . ' 23:59:59' : null;

            // 1. Total Users
            $usersBuilder = $db->table('users');
            if ($start && $end) {
                $usersBuilder->where('created_at >=', $start)->where('created_at <=', $end);
            }
            $totalUsers = $usersBuilder->countAllResults();

            // 2. Total Redemptions
            $redBuilder = $db->table('redemptions');
            if ($start && $end) {
                $redBuilder->where('created_at >=', $start)->where('created_at <=', $end);
            }
            $totalRedemptions = $redBuilder->countAllResults();

            // 3. Points Redeemed
            $pointsBuilder = $db->table('redemptions re')
                                ->selectSum('r.cost', 'total')
                                ->join('rewards r', 'r.id = re.reward_id', 'left');
            if ($start && $end) {
                $pointsBuilder->where('re.created_at >=', $start)->where('re.created_at <=', $end);
            }
            $pointsRow = $pointsBuilder->get()->getRow();
            $pointsRedeemed = (int) ($pointsRow->total ?? 0);

            // 4. Top Rewards
            $topRewardsBuilder = $db->table('redemptions re')
                                     ->select('r.title, COUNT(re.id) as count')
                                     ->join('rewards r', 'r.id = re.reward_id', 'left')
                                     ->groupBy('r.id, r.title')
                                     ->orderBy('count', 'DESC')
                                     ->limit(5);
            if ($start && $end) {
                $topRewardsBuilder->where("re.created_at BETWEEN '$start' AND '$end'");
            }
            $topRewards = $topRewardsBuilder->get()->getResultArray();

            // 5. Chart Data
            $dates = [];
            if ($startDate && $endDate) {
                $startTS = strtotime($startDate);
                $endTS = strtotime($endDate);
                for ($curr = $startTS; $curr <= $endTS; $curr += 86400) {
                    $date = date('Y-m-d', $curr);
                    $dates[$date] = [
                        'date' => $date, 
                        'redemptions_count' => 0, 
                        'redemptions_points' => 0,
                        'codes_count' => 0,
                        'codes_points' => 0
                    ];
                }
            } else {
                for ($i = 6; $i >= 0; $i--) {
                    $date = date('Y-m-d', strtotime("-$i days"));
                    $dates[$date] = [
                        'date' => $date, 
                        'redemptions_count' => 0, 
                        'redemptions_points' => 0,
                        'codes_count' => 0,
                        'codes_points' => 0
                    ];
                }
            }

            // Redemptions (Rewards)
            $redQuery = "
                SELECT DATE(re.created_at) as date, COUNT(*) as count, SUM(r.cost) as points 
                FROM redemptions re
                JOIN rewards r ON r.id = re.reward_id
                WHERE 1=1
            ";
            if ($start && $end) {
                $redQuery .= " AND re.created_at BETWEEN '$start' AND '$end'";
            } else {
                $redQuery .= " AND re.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            }
            $redQuery .= " GROUP BY DATE(re.created_at)";
            $redByDay = $db->query($redQuery)->getResultArray();

            // Entry Codes
            $codesQuery = "
                SELECT DATE(used_at) as date, COUNT(*) as count, SUM(puntos) as points 
                FROM tblCodigoEntrada 
                WHERE is_used = 1
            ";
            if ($start && $end) {
                $codesQuery .= " AND used_at BETWEEN '$start' AND '$end'";
            } else {
                $codesQuery .= " AND used_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
            }
            $codesQuery .= " GROUP BY DATE(used_at)";
            $codesByDay = $db->query($codesQuery)->getResultArray();

            foreach ($redByDay as $row) {
                if (isset($dates[$row['date']])) {
                    $dates[$row['date']]['redemptions_count'] = (int)$row['count'];
                    $dates[$row['date']]['redemptions_points'] = (int)$row['points'];
                }
            }
            foreach ($codesByDay as $row) {
                if (isset($dates[$row['date']])) {
                    $dates[$row['date']]['codes_count'] = (int)$row['count'];
                    $dates[$row['date']]['codes_points'] = (int)$row['points'];
                }
            }

            // 6. Recent Activity (Rewards)
            $recentActivity = $db->table('redemptions re')
                                 ->select('u.email as user, r.title as reward, re.created_at')
                                 ->join('users u', 'u.id = re.user_id')
                                 ->join('rewards r', 'r.id = re.reward_id')
                                 ->orderBy('re.created_at', 'DESC')
                                 ->limit(50) // More for pagination
                                 ->get()
                                 ->getResultArray();

            // Historical Totals (ignoring filters)
            $histUsers = $db->table('users')->countAllResults();
            $histRedemptions = $db->table('redemptions')->countAllResults();
            $histPointsRow = $db->table('redemptions re')
                               ->selectSum('r.cost', 'total')
                               ->join('rewards r', 'r.id = re.reward_id', 'left')
                               ->get()->getRow();
            $histPoints = $histPointsRow->total ?? 0;
            $dbName = $db->getDatabase();

            // 7. Validity Alerts (Cine Codes)
            $limitDate = date('Y-m-d H:i:s', strtotime('+56 days'));
            $warningDate = date('Y-m-d H:i:s', strtotime('+71 days')); // 56 + 15 days
            
            $alertsQuery = "
                SELECT 
                    r.id as reward_id, 
                    r.title as reward_title, 
                    v.id as vigencia_id, 
                    v.fecha_inicio, 
                    v.fecha_fin,
                    COUNT(rc.id) as unused_codes_count,
                    CASE 
                        WHEN v.fecha_fin < '$limitDate' THEN 'danger'
                        ELSE 'warning'
                    END as status
                FROM reward_codes rc
                JOIN vigencias v ON v.id = rc.id_vigencia
                JOIN rewards r ON r.id = rc.reward_id
                WHERE rc.is_used = 0 
                  AND v.fecha_fin < '$warningDate'
                GROUP BY r.id, r.title, v.id, v.fecha_inicio, v.fecha_fin
                ORDER BY v.fecha_fin ASC
            ";
            
            $validityAlerts = $db->query($alertsQuery)->getResultArray();

            return $this->respond([
                'cards' => [
                    'users' => $totalUsers,
                    'redemptions' => $totalRedemptions,
                    'points' => (int)$pointsRedeemed,
                    'hist_users' => $histUsers,
                    'hist_redemptions' => $histRedemptions,
                    'hist_points' => (int)$histPoints,
                    'debug' => [
                        'start' => $start,
                        'end' => $end,
                        'db' => $dbName
                    ]
                ],
                'chart' => array_values($dates),
                'top_rewards' => $topRewards,
                'recent' => $recentActivity,
                'validity_alerts' => $validityAlerts
            ]);

        } catch (\Exception $e) {
            log_message('error', 'Dashboard Stats Error: ' . $e->getMessage());
            return $this->respond([
                'cards' => ['users' => 0, 'redemptions' => 0, 'points' => 0, 'hist_users' => 0, 'hist_redemptions' => 0, 'hist_points' => 0],
                'chart' => [],
                'top_rewards' => [],
                'recent' => [],
                'validity_alerts' => [],
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
}
