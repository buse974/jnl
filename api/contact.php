<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['success' => false, 'message' => 'Method not allowed']);
}

try {
    $payload = read_payload();

    $honeypot = trim((string)($payload['website'] ?? ''));
    if ($honeypot !== '') {
        // Fake success for bots.
        respond(200, ['success' => true, 'message' => 'Message sent']);
    }

    $startedAt = (int)($payload['started_at'] ?? 0);
    if ($startedAt > 0 && (time() - $startedAt) < 2) {
        respond(429, ['success' => false, 'message' => 'Too many requests']);
    }

    $nom = sanitize_line((string)($payload['nom'] ?? ''));
    $prenom = sanitize_line((string)($payload['prenom'] ?? ''));
    $email = sanitize_line((string)($payload['email'] ?? ''));
    $telephone = sanitize_line((string)($payload['telephone'] ?? ''));
    $service = sanitize_line((string)($payload['service'] ?? ''));
    $message = trim((string)($payload['message'] ?? ''));

    $errors = [];
    if ($nom === '' || mb_strlen($nom) > 100) {
        $errors[] = 'nom';
    }
    if ($prenom === '' || mb_strlen($prenom) > 100) {
        $errors[] = 'prenom';
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 190) {
        $errors[] = 'email';
    }
    if ($telephone === '' || mb_strlen($telephone) > 40) {
        $errors[] = 'telephone';
    }
    if (mb_strlen($message) > 5000) {
        $errors[] = 'message';
    }

    if (!empty($errors)) {
        respond(422, [
            'success' => false,
            'message' => 'Invalid fields',
            'errors' => $errors,
        ]);
    }

    $to = getenv('MAIL_TO') ?: 'buse974@gmail.com';
    $from = getenv('MAIL_FROM') ?: 'noreply@jnl-service.fr';
    $fromName = sanitize_line(getenv('MAIL_FROM_NAME') ?: 'JNL Service');
    $subjectPrefix = sanitize_line(getenv('MAIL_SUBJECT_PREFIX') ?: 'JNL Service - Contact');
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('Invalid MAIL_TO configuration');
    }
    if (!filter_var($from, FILTER_VALIDATE_EMAIL)) {
        throw new RuntimeException('Invalid MAIL_FROM configuration');
    }

    $subject = $subjectPrefix;
    $bodyLines = [
        'New contact request from jnl-service.fr',
        '',
        'Nom: ' . $nom,
        'Prenom: ' . $prenom,
        'Email: ' . $email,
        'Telephone: ' . $telephone,
        'Service: ' . ($service !== '' ? $service : 'non renseigne'),
        'IP: ' . $ip,
        'Date: ' . date('c'),
        '',
        'Message:',
        $message !== '' ? $message : '(vide)',
    ];

    $body = implode("\r\n", $bodyLines);
    smtp_send(
        $to,
        $from,
        $fromName,
        $email,
        $subject,
        $body
    );

    respond(200, ['success' => true, 'message' => 'Message sent']);
} catch (Throwable $exception) {
    error_log('[contact.php] ' . $exception->getMessage());
    respond(500, ['success' => false, 'message' => 'Unable to send message']);
}

function respond(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_payload(): array
{
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    if (stripos($contentType, 'application/json') !== false) {
        $raw = file_get_contents('php://input');
        $decoded = json_decode($raw ?: '{}', true);
        return is_array($decoded) ? $decoded : [];
    }

    return $_POST;
}

function sanitize_line(string $value): string
{
    $value = trim($value);
    return preg_replace('/[\r\n]+/', ' ', $value) ?? '';
}

function smtp_send(
    string $to,
    string $from,
    string $fromName,
    string $replyTo,
    string $subject,
    string $body
): void {
    $host = getenv('SMTP_HOST') ?: 'postfix';
    $port = (int)(getenv('SMTP_PORT') ?: '25');
    $user = getenv('SMTP_USER') ?: '';
    $pass = getenv('SMTP_PASS') ?: '';
    $encryption = strtolower((string)(getenv('SMTP_ENCRYPTION') ?: ''));
    $timeout = 12.0;

    $remote = $encryption === 'ssl' ? sprintf('ssl://%s:%d', $host, $port) : sprintf('%s:%d', $host, $port);
    $socket = @stream_socket_client($remote, $errno, $errstr, $timeout, STREAM_CLIENT_CONNECT);
    if (!is_resource($socket)) {
        throw new RuntimeException(sprintf('SMTP connect failed (%d): %s', $errno, $errstr));
    }

    stream_set_timeout($socket, (int)$timeout);

    smtp_expect($socket, [220]);
    smtp_command($socket, 'EHLO ' . (gethostname() ?: 'localhost'), [250]);

    if ($encryption === 'tls') {
        smtp_command($socket, 'STARTTLS', [220]);
        $enabled = stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
        if ($enabled !== true) {
            fclose($socket);
            throw new RuntimeException('Unable to enable STARTTLS');
        }
        smtp_command($socket, 'EHLO ' . (gethostname() ?: 'localhost'), [250]);
    }

    if ($user !== '') {
        smtp_command($socket, 'AUTH LOGIN', [334]);
        smtp_command($socket, base64_encode($user), [334]);
        smtp_command($socket, base64_encode($pass), [235]);
    }

    smtp_command($socket, 'MAIL FROM:<' . $from . '>', [250]);
    smtp_command($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
    smtp_command($socket, 'DATA', [354]);

    $subjectHeader = 'Subject: ' . encode_header($subject);
    $fromHeader = 'From: ' . encode_header($fromName) . ' <' . $from . '>';
    $replyHeader = filter_var($replyTo, FILTER_VALIDATE_EMAIL) ? ('Reply-To: ' . $replyTo) : '';
    $headers = [
        $fromHeader,
        $replyHeader,
        $subjectHeader,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'Date: ' . date(DATE_RFC2822),
    ];
    $headers = array_values(array_filter($headers));

    $safeBody = preg_replace('/(?m)^\./', '..', $body) ?? $body;
    $messageData = implode("\r\n", $headers) . "\r\n\r\n" . $safeBody . "\r\n.";

    fwrite($socket, $messageData . "\r\n");
    smtp_expect($socket, [250]);
    smtp_command($socket, 'QUIT', [221]);
    fclose($socket);
}

function smtp_command($socket, string $command, array $expectedCodes): void
{
    fwrite($socket, $command . "\r\n");
    smtp_expect($socket, $expectedCodes);
}

function smtp_expect($socket, array $expectedCodes): void
{
    $response = '';
    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (strlen($line) < 4 || $line[3] !== '-') {
            break;
        }
    }

    if ($response === '') {
        throw new RuntimeException('SMTP empty response');
    }

    $code = (int)substr($response, 0, 3);
    if (!in_array($code, $expectedCodes, true)) {
        throw new RuntimeException('SMTP unexpected response: ' . trim($response));
    }
}

function encode_header(string $value): string
{
    if (function_exists('mb_encode_mimeheader')) {
        return mb_encode_mimeheader($value, 'UTF-8', 'B', "\r\n");
    }

    return $value;
}
