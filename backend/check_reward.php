<?php
$conn = mysqli_connect('localhost', 'ughgtdncr7ro5', 'mrL*1*P7ke&f', 'db4ccgnbnclgjg');
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

$res = mysqli_query($conn, "SELECT id, title, type, coordinates, code_areas, vigencia_area FROM rewards");
while ($row = mysqli_fetch_assoc($res)) {
    echo "ID: " . $row['id'] . " | Title: " . $row['title'] . " | type: " . $row['type'] . "\n";
    echo "Coordinates: " . $row['coordinates'] . "\n";
    echo "Code Areas: " . $row['code_areas'] . "\n";
    echo "Vigencia Area: " . $row['vigencia_area'] . "\n";
    echo "--------------------------------------------------\n";
}

$res2 = mysqli_query($conn, "SELECT rc.id, rc.reward_id, rc.code, rc.id_vigencia, v.fecha_inicio, v.fecha_fin FROM reward_codes rc LEFT JOIN vigencias v ON rc.id_vigencia = v.id WHERE rc.is_used = 0 ORDER BY rc.id DESC LIMIT 5");
echo "RECENT UNUSED CODES:\n";
while ($row = mysqli_fetch_assoc($res2)) {
    print_r($row);
}
mysqli_close($conn);
