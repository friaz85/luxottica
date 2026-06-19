<?php

namespace App\Libraries;

use UltraMsg\WhatsAppApi;

class WhatsAppNotifier
{
    private static function getClient()
    {
        // Configuración de Ultramsg
        // TODO: Mover a archivo de configuración
        $instanceId = getenv('ULTRAMSG_INSTANCE_ID') ?: 'instance123456'; // Reemplazar con tu instance ID
        $token      = getenv('ULTRAMSG_TOKEN') ?: 'your_token_here'; // Reemplazar con tu token

        return new WhatsAppApi($token, $instanceId);
    }

    /**
     * Enviar alerta de stock bajo
     */
    public static function sendLowStockAlert($rewardTitle, $currentStock)
    {
        try {
            $client      = self::getClient();
            $adminPhones = [
                '5215576100376',
                '5215514551876',
                '5215564166398',
                '5215525206332'
            ];

            $message  = "🚨 *ALERTA DE STOCK BAJO*\n\n";
            $message .= "Recompensa: *{$rewardTitle}*\n";
            $message .= "Stock actual: *{$currentStock} unidades*\n\n";
            $message .= "⚠️ Se recomienda reabastecer pronto.";

            foreach ($adminPhones as $phone) {
                $client->sendChatMessage($phone, $message);
            }

            log_message('info', 'WhatsApp Low Stock Alerts sent to ' . count($adminPhones) . ' recipients');
            return true;
        } catch (\Exception $e) {
            log_message('error', 'WhatsApp notification failed: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Enviar notificación de pedido actualizado
     */
    public static function sendOrderStatusUpdate($phone, $orderStatus, $orderDetails)
    {
        try {
            $client = self::getClient();

            $statusMessages = [
                'processing' => '⏳ Tu pedido está siendo procesado',
                'shipped'    => '📦 Tu pedido ha sido enviado',
                'delivered'  => '✅ Tu pedido ha sido entregado'
            ];

            $message  = "*Takis - Actualización de Pedido*\n\n";
            $message .= $statusMessages[$orderStatus] ?? 'Estado actualizado';
            $message .= "\n\nPedido: #{$orderDetails['id']}";

            if (!empty($orderDetails['tracking_url'])) {
                $message .= "\n\n🔍 Rastreo: {$orderDetails['tracking_url']}";
            }

            $response = $client->sendChatMessage($phone, $message);

            log_message('info', 'WhatsApp Order Update sent: ' . json_encode($response));
            return true;
        } catch (\Exception $e) {
            log_message('error', 'WhatsApp notification failed: ' . $e->getMessage());
            return false;
        }
    }
}
