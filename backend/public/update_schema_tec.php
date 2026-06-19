<?php
$hostname = "localhost";
$username = "ucbg7g32ldwvg";
$password = "fg1uj2@:#11l";
$database = "dbeisjvxfx8psg";

$conn = new mysqli($hostname, $username, $password, $database);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "Updating schema for Embajadores TEC...<br>";

$queries = [
    "DROP TABLE IF EXISTS security_logs",
    "DROP TABLE IF EXISTS reward_codes",
    "DROP TABLE IF EXISTS redemptions",
    "DROP TABLE IF EXISTS rewards",
    "DROP TABLE IF EXISTS admin_users",
    "DROP TABLE IF EXISTS tblCodigoEntrada",
    "DROP TABLE IF EXISTS users",
    "DROP TABLE IF EXISTS tblProyecto",

    "CREATE TABLE tblProyecto (
        idProyecto INT AUTO_INCREMENT PRIMARY KEY,
        Proyecto VARCHAR(255) NOT NULL,
        Fecha_Inicio DATE NOT NULL,
        Fecha_Fin DATE NOT NULL
    )",

    "CREATE TABLE users (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        id_proyecto INT,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(20),
        points INT DEFAULT 0,
        role ENUM('user', 'admin') DEFAULT 'user',
        is_blocked TINYINT(1) DEFAULT 0,
        blocked_reason TEXT,
        blocked_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (id_proyecto) REFERENCES tblProyecto(idProyecto) ON DELETE SET NULL
    )",

    "CREATE TABLE tblCodigoEntrada (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        id_proyecto INT,
        codigo VARCHAR(50) NOT NULL UNIQUE,
        puntos INT DEFAULT 0,
        is_used TINYINT(1) DEFAULT 0,
        used_by INT UNSIGNED,
        used_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_proyecto) REFERENCES tblProyecto(idProyecto) ON DELETE CASCADE,
        FOREIGN KEY (used_by) REFERENCES users(id)
    )",

    "CREATE TABLE admin_users (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role ENUM('admin', 'quantum', 'system_admin') DEFAULT 'admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )",

    "CREATE TABLE rewards (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        cost INT NOT NULL,
        stock INT NOT NULL,
        image_url VARCHAR(255),
        type ENUM('physical', 'digital') DEFAULT 'physical',
        pdf_template VARCHAR(255),
        code_areas TEXT,
        active TINYINT(1) DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )",

    "CREATE TABLE redemptions (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NOT NULL,
        reward_id INT UNSIGNED NOT NULL,
        status ENUM('pending', 'review', 'processing', 'shipped', 'delivered', 'completed') DEFAULT 'pending',
        digital_code TEXT,
        pdf_path VARCHAR(255),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (reward_id) REFERENCES rewards(id)
    )",

    "CREATE TABLE reward_codes (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        reward_id INT UNSIGNED,
        code VARCHAR(50) NOT NULL,
        is_used TINYINT(1) DEFAULT 0,
        FOREIGN KEY (reward_id) REFERENCES rewards(id)
    )",

    "CREATE TABLE security_logs (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        user_id INT UNSIGNED NULL,
        ip_address VARCHAR(45) NOT NULL,
        action VARCHAR(100) NOT NULL,
        details TEXT,
        last_attempt DATETIME DEFAULT CURRENT_TIMESTAMP
    )"
];

foreach ($queries as $sql) {
    if ($conn->query($sql) === TRUE) {
        echo "Query successful: " . substr($sql, 0, 30) . "...<br>";
    } else {
        echo "Error: " . $conn->error . " in query: " . $sql . "<br>";
    }
}

// Insert Initial Project
$conn->query("INSERT INTO tblProyecto (Proyecto, Fecha_Inicio, Fecha_Fin) VALUES ('Embajadores TEC 2026', '2026-01-01', '2026-12-31')");
$projectId = $conn->insert_id;

// Insert Admin
$adminPass = password_hash('fg1uj2@:#11l', PASSWORD_DEFAULT);
$conn->query("INSERT INTO admin_users (username, email, password_hash, role) VALUES ('admin', 'admin@qrewards.com.mx', '$adminPass', 'system_admin')");

// Insert Test User
$userPass = password_hash('tec2026!', PASSWORD_DEFAULT);
$conn->query("INSERT INTO users (id_proyecto, email, full_name, password_hash, role, points) VALUES ($projectId, 'embajador@tec.mx', 'Embajador Prueba', '$userPass', 'user', 5000)");

echo "Schema update complete.";
$conn->close();
?>
