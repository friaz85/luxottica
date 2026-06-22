<?php

namespace App\Services;

/**
 * PasswordCryptoService
 *
 * Encripta y desencripta passwords usando AES-256-CBC.
 * La clave se toma de la variable de entorno PWD_CIPHER_KEY.
 * NUNCA usa bcrypt (unidireccional). Solo para el campo password_encrypted.
 */
class PasswordCryptoService
{
    private const CIPHER = 'AES-256-CBC';

    private static function key(): string
    {
        $k = env('PWD_CIPHER_KEY', '');
        if (empty($k)) {
            throw new \RuntimeException('PWD_CIPHER_KEY no está configurada en .env');
        }
        // Derive a 32-byte key from the configured string
        return hash('sha256', $k, true);
    }

    /**
     * Encripta un password en texto plano.
     * Devuelve un string base64 que incluye IV + ciphertext.
     */
    public static function encrypt(string $plainPassword): string
    {
        $iv         = random_bytes(16);
        $ciphertext = openssl_encrypt($plainPassword, self::CIPHER, self::key(), OPENSSL_RAW_DATA, $iv);
        // Prefix IV so we can decrypt later: base64(iv + ciphertext)
        return base64_encode($iv . $ciphertext);
    }

    /**
     * Desencripta un password previamente encriptado con encrypt().
     */
    public static function decrypt(string $encrypted): string
    {
        $raw        = base64_decode($encrypted);
        $iv         = substr($raw, 0, 16);
        $ciphertext = substr($raw, 16);
        $plain      = openssl_decrypt($ciphertext, self::CIPHER, self::key(), OPENSSL_RAW_DATA, $iv);
        return $plain === false ? '' : $plain;
    }
}
