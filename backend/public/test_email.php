<?php

// CLI script to test email functionality
// Usage: php backend/public/test_email.php friaz85@gmail.com

define('FCPATH', __DIR__ . DIRECTORY_SEPARATOR);
chdir(__DIR__);

require FCPATH . '../app/Config/Paths.php';
$paths = new Config\Paths();

// Explicitly set paths for CLI
$paths->writableDirectory = realpath(__DIR__ . '/../writable');

require rtrim($paths->systemDirectory, '\\/ ') . DIRECTORY_SEPARATOR . 'bootstrap.php';

// Load DotEnv
require_once SYSTEMPATH . 'Config/DotEnv.php';
(new CodeIgniter\Config\DotEnv(ROOTPATH))->load();

// Set Environment
if (!defined('ENVIRONMENT')) {
    define('ENVIRONMENT', env('CI_ENVIRONMENT', 'production'));
}

// Load Composer Autoload
if (file_exists(ROOTPATH . 'vendor/autoload.php')) {
    require_once ROOTPATH . 'vendor/autoload.php';
}

$app = Config\Services::codeigniter();
$app->initialize();
$app->setContext('php-cli');

use App\Libraries\EmailSender;

$to = $argv[1] ?? null;

if (!$to) {
    die("Usage: php test_email.php recipient@example.com\n");
}

echo "--- Takis Email Test ---\n";
echo "Recipient: $to\n";
echo "Host: " . env('EMAIL_HOST') . "\n";
echo "User: " . env('EMAIL_USERNAME') . "\n";
echo "------------------------\n";

$subject = "Prueba de Takis Promo - " . date('Y-m-d H:i:s');
$title   = "Prueba de Conectividad";
$message = "<p>Esta es una prueba para verificar que el servidor SMTP está configurado correctamente con los nuevos datos recibidos.</p>";

try {
    $result = EmailSender::sendEmail($to, $subject, $title, $message, "VISITAR SITIO", "https://dev.takisaficionintensa.com.mx");

    if ($result) {
        echo "\n✅ SUCCESS: El correo fue enviado correctamente.\n";
    } else {
        echo "\n❌ FAILED: Hubo un error al enviar el correo.\n";
        $email = \Config\Services::email();
        echo $email->printDebugger(['headers', 'subject', 'body']);
    }
} catch (\Exception $e) {
    echo "\n💥 ERROR EXCEPTION: " . $e->getMessage() . "\n";
}
