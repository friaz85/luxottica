<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use Config\Database;

class AdminDomainsController extends ResourceController
{
    private $db;

    public function __construct()
    {
        $this->db = Database::connect();
        $this->setupTable();
    }

    private function setupTable()
    {
        // Simple auto-migration
        $this->db->query("CREATE TABLE IF NOT EXISTS `blocked_domains` (
            `id` INT(11) NOT NULL AUTO_INCREMENT,
            `domain` VARCHAR(255) NOT NULL,
            `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `idx_domain` (`domain`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        // Seed if empty
        $count = $this->db->table('blocked_domains')->countAllResults();
        if ($count === 0) {
            $initialDomains = [
                'ostahie.com',
                'hutudns.com',
                'creteanu.com',
                'netoiu.com',
                'fentaoba.com',
                'kaoing.com',
                'bitoini.com',
                'dolofan.com',
                'pazuric.com',
                'bultoc.com',
                'esyline.com',
                'seaswar.com',
                'amiralty.com',
                'alibto.com',
                'rivken.com',
                'boftm.com',
                'barneu.com',
                'cosxo.com',
                'advarm.com',
                'teszari.com',
                'cslua.com',
                'feriwor.com',
                'daerdy.com'
            ];
            $data           = [];
            foreach ($initialDomains as $d) {
                $data[] = [
                    'domain' => $d
                ];
            }
            $this->db->table('blocked_domains')->ignore(true)->insertBatch($data);
        }
    }

    public function index()
    {
        try {
            $builder = $this->db->table('blocked_domains');

            $search = $this->request->getGet('search');
            if ($search) {
                $builder->like('domain', $search);
            }

            $builder->orderBy('created_at', 'DESC');

            $pageParam = $this->request->getGet('page');
            if ($pageParam === null) {
                return $this->respond($builder->get()->getResultArray());
            }

            $page    = (int) $pageParam;
            $perPage = (int) ($this->request->getGet('per_page') ?? 10);
            $offset  = ($page - 1) * $perPage;

            $countBuilder = clone $builder;
            $total        = $countBuilder->countAllResults();

            $data = $builder->get($perPage, $offset)->getResultArray();

            return $this->respond([
                'data'  => $data,
                'pager' => [
                    'current_page' => $page,
                    'per_page'     => $perPage,
                    'total_pages'  => ceil($total / $perPage),
                    'total_items'  => $total
                ]
            ]);
        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function create()
    {
        try {
            $json = $this->request->getJSON();
            if (!$json || !isset($json->domain)) {
                return $this->failValidationErrors('Domain is required');
            }

            $domain = trim(strtolower($json->domain));

            // Allow subdomains, but require at least domain.tld
            if (!preg_match('/^[a-z0-9\-]+\.[a-z]{2,}$/i', $domain)) {
                return $this->failValidationErrors('Invalid domain format');
            }

            $exists = $this->db->table('blocked_domains')->where('domain', $domain)->countAllResults();
            if ($exists > 0) {
                return $this->failValidationErrors('Domain already exists in the blocklist');
            }

            $this->db->table('blocked_domains')->insert([
                'domain' => $domain
            ]);

            return $this->respondCreated(['message' => 'Domain blocked successfully']);
        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }

    public function delete($id = null)
    {
        try {
            if (!$id) {
                return $this->failValidationErrors('ID is required');
            }

            $this->db->table('blocked_domains')->where('id', $id)->delete();
            return $this->respondDeleted(['message' => 'Domain removed from blocklist']);
        } catch (\Exception $e) {
            return $this->failServerError($e->getMessage());
        }
    }
}
