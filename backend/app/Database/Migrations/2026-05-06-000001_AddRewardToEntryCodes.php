<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class AddRewardToEntryCodes extends Migration
{
    public function up()
    {
        $fields = [
            'id_recompensa' => [
                'type'       => 'INT',
                'unsigned'   => true,
                'null'       => true,
                'after'      => 'puntos',
            ],
        ];
        $this->forge->addColumn('tblCodigoEntrada', $fields);

        $this->db->query("ALTER TABLE tblCodigoEntrada ADD CONSTRAINT fk_entry_code_reward FOREIGN KEY (id_recompensa) REFERENCES rewards(id) ON DELETE SET NULL");
    }

    public function down()
    {
        $this->db->query("ALTER TABLE tblCodigoEntrada DROP FOREIGN KEY fk_entry_code_reward");
        $this->forge->dropColumn('tblCodigoEntrada', 'id_recompensa');
    }
}
