<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateEmailCampaignLogsTable extends Migration
{
    public function up()
    {
        $this->forge->addField([
            'id' => [
                'type'           => 'INT',
                'constraint'     => 11,
                'unsigned'       => true,
                'auto_increment' => true,
            ],
            'user_id' => [
                'type'       => 'INT',
                'constraint'     => 11,
                'unsigned'   => true,
                'null'       => true,
            ],
            'email' => [
                'type'       => 'VARCHAR',
                'constraint' => '255',
            ],
            'campaign_type' => [
                'type'       => 'VARCHAR',
                'constraint' => '50',
            ],
            'sent_at' => [
                'type' => 'DATETIME',
                'null' => true,
            ],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('email_campaign_logs');
    }

    public function down()
    {
        $this->forge->dropTable('email_campaign_logs');
    }
}
