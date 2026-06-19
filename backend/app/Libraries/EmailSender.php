<?php

namespace App\Libraries;

class EmailSender
{
    public static function sendEmail($to, $subject, $title, $messageHtml, $actionText = null, $actionUrl = null)
    {
        $email = \Config\Services::email();

        // Use SMTP configuration from .env
        $config['protocol']   = 'smtp';
        $config['SMTPHost']   = env('EMAIL_HOST');
        $config['SMTPUser']   = env('EMAIL_USERNAME');
        $config['SMTPPass']   = env('EMAIL_PASSWORD');
        $config['SMTPPort']   = env('EMAIL_PORT', 465);
        $config['SMTPCrypto'] = env('EMAIL_SMTP_CRYPTO', 'ssl');

        $config['mailType'] = 'html';
        $config['charset']  = 'utf-8';
        $config['wordWrap'] = true;
        $config['newline']  = "\r\n";
        $config['CRLF']     = "\r\n";

        $email->initialize($config);

        $fromEmail = env('EMAIL_FROM');
        $fromName  = env('EMAIL_FROM_NAME', 'Embajadores TEC');

        $email->setFrom($fromEmail, $fromName);
        $email->setTo($to);
        $email->setSubject($subject);

        $html = self::buildHtml($title, $messageHtml, $actionText, $actionUrl);
        $email->setMessage($html);

        return $email->send();
    }

    private static function buildHtml($title, $message, $btnText, $btnUrl)
    {
        $primaryColor = '#003366'; // TEC Blue
        $accentColor  = '#00cc66'; // Green accent
        $bgColor      = '#f4f7f9';
        $cardColor    = '#ffffff';

        $logoUrl = 'https://q-tokens.com.mx/public_html/embajadores-tec/assets/img/Logo_Tec.png';
        $year = date('Y');

        $buttonHtml = '';
        if ($btnText && $btnUrl) {
            $buttonHtml = "
                <div style='margin-top: 30px;'>
                    <a href='$btnUrl' style='background-color: $primaryColor; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;'>$btnText</a>
                </div>";
        }

        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>$title</title>
</head>
<body style="margin: 0; padding: 0; background-color: $bgColor; font-family: Arial, sans-serif; color: #333333;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: $bgColor;">
        <tr>
            <td align="center" style="padding: 40px 10px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; background-color: $cardColor; border-radius: 16px; border: 1px solid #dddddd; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    <tr>
                        <td align="center" style="padding: 30px; border-bottom: 1px solid #eeeeee;">
                            <img src="$logoUrl" alt="Embajadores TEC" width="180" style="display: block; border: 0; margin: 0 auto;">
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 40px 30px; text-align: center;">
                            <h1 style="color: $primaryColor; font-size: 24px; margin: 0 0 20px 0; font-weight: bold;">$title</h1>
                            <div style="color: #666666; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                                $message
                            </div>
                            $buttonHtml
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px; background-color: #f8f9fa; text-align: center; color: #999999; font-size: 12px;">
                            <p style="margin: 0;">&copy; $year Embajadores TEC. Todos los derechos reservados.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;
    }
}
