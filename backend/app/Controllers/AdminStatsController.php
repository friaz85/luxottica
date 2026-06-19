<?php

namespace App\Controllers;

use App\Models\RewardModel;
use App\Models\RedemptionModel;
use App\Models\UserModel;
use CodeIgniter\RESTful\ResourceController;

class AdminStatsController extends ResourceController
{
    public function getStats()
    {
        $rewardModel     = new RewardModel();
        $redemptionModel = new RedemptionModel();
        $userModel       = new UserModel();

        $totalUsers          = $userModel->countAllResults();
        $totalRedemptions    = $redemptionModel->countAllResults();
        $totalPointsInvested = $userModel->selectSum('points')->first()['points'] ?? 0;

        // Status Distribution
        $statusCounts = $redemptionModel->select('status, COUNT(*) as count')
            ->groupBy('status')
            ->findAll();

        // Stock alerts (Low stock < 5)
        $lowStock = $rewardModel->where('stock <', 5)->findAll();

        return $this->respond([
            'kpis'                => [
                'total_users'        => $totalUsers,
                'total_redemptions'  => $totalRedemptions,
                'points_circulating' => $totalPointsInvested
            ],
            'status_distribution' => $statusCounts,
            'low_stock_alerts'    => $lowStock
        ]);
    }

    public function getSpecialRedeemUsers()
    {
        $db = \Config\Database::connect();
        $builder = $db->table('users u');
        
        $builder->select('u.id, u.full_name, u.email, u.points, MAX(sl.last_attempt) as ultimo_login');
        $builder->join('security_logs sl', 'u.id = sl.user_id', 'inner');
        $builder->where('sl.action', 'login_success');
        $builder->where('u.points >=', 3);
        $builder->where('u.points <=', 5);
        $builder->groupBy('u.id');
        $builder->having('ultimo_login <', date('Y-m-d H:i:s', strtotime('-1 month')));
        $builder->orderBy('ultimo_login', 'DESC');

        $users = $builder->get()->getResultArray();

        // Get Stock for Special Rewards (23, 25)
        $rewardsStock = [];
        foreach ([23, 25] as $rid) {
            // Count unused codes in reward_codes table
            $count = $db->table('reward_codes')
                ->where('reward_id', $rid)
                ->where('is_used', 0)
                ->countAllResults();
            $rewardsStock[$rid] = $count;
        }

        return $this->respond([
            'users' => $users,
            'stock' => $rewardsStock
        ]);
    }
}
