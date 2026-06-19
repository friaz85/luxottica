<?php
$conn = mysqli_connect('localhost', 'uja2i2v274lkm', '31q)+2&I&5%4', 'dbemgylpsiadtp');
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}
$res = mysqli_query($conn, "SELECT id, title, type, pdf_template, image_url FROM rewards");
$data = [];
while ($row = mysqli_fetch_assoc($res)) {
    $data[] = $row;
}
echo json_encode($data, JSON_PRETTY_PRINT);
mysqli_close($conn);
