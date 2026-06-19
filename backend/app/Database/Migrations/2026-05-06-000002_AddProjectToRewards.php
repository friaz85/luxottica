<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddProjectToRewards extends Migration
{
    public function up()
    {
        $fields = [
            'id_proyecto' => [
                'type'       => 'INT',
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'id',
            ],
        ];
        $this->forge->addColumn('rewards', $fields);

        // Foreign key
        $this->db->query("ALTER TABLE rewards ADD CONSTRAINT fk_reward_project FOREIGN KEY (id_proyecto) REFERENCES tblProyecto(idProyecto) ON DELETE SET NULL");
    }

    public function down()
    {
        $this->db->query("ALTER TABLE rewards DROP FOREIGN KEY fk_reward_project");
        $this->forge->dropColumn('rewards', 'id_proyecto');
    }
}
