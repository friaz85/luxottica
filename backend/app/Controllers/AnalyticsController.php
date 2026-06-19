<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;

class AnalyticsController extends ResourceController
{
    public function logVisit()
    {
        $db = \Config\Database::connect();

        $data = $this->request->getJSON(true);
        $ip   = $this->request->getIPAddress();
        $ua   = $this->request->getUserAgent()->getAgentString();

        $pageUrl = $data['url'] ?? 'unknown';
        $userId  = $data['user_id'] ?? null;

        // Validation for user_id to prevent FK errors
        if ($userId && !is_numeric($userId)) {
            $userId = null;
        }

        $insertData = [
            'ip_address' => $ip,
            'user_agent' => $ua,
            'page_url'   => $pageUrl,
            'user_id'    => $userId,
            'created_at' => date('Y-m-d H:i:s')
        ];

        try {
            $db->table('site_visits')->insert($insertData);
            return $this->respond(['status' => 'success'])
                ->setHeader('Access-Control-Allow-Origin', '*')
                ->setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
                ->setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        } catch (\Throwable $e) {
            log_message('error', '[Analytics] Error logging visit: ' . $e->getMessage());
            return $this->respond(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function getVisitStats()
    {
        $db = \Config\Database::connect();

        // Total visits
        $total = $db->table('site_visits')->countAll();

        // Unique visitors (by IP)
        $unique = $db->query("SELECT COUNT(DISTINCT ip_address) as count FROM site_visits")->getRow()->count;

        // Visits today
        $today = $db->table('site_visits')->where('DATE(created_at)', date('Y-m-d'))->countAllResults();

        // Visits per day (Last 7 days)
        $daily = $db->query("
            SELECT DATE(created_at) as date, COUNT(*) as count 
            FROM site_visits 
            WHERE created_at >= DATE(NOW()) - INTERVAL 7 DAY 
            GROUP BY DATE(created_at) 
            ORDER BY date ASC
        ")->getResultArray();

        return $this->respond([
            'total'  => $total,
            'unique' => $unique,
            'today'  => $today,
            'chart'  => $daily
        ]);
    }
}
