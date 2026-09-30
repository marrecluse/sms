<?php
// backend/middleware/auth.php
require_once dirname(__DIR__) . '/config/env.php';

class Auth {
    public static function generateToken(array $payload): string {
        $secret = env('JWT_SECRET', 'changeme');
        $header  = base64_encode(json_encode(['alg'=>'HS256','typ'=>'JWT']));
        $payload['exp'] = time() + (int) env('JWT_EXPIRY', 86400);
        $payload['iat'] = time();
        $body    = base64_encode(json_encode($payload));
        $sig     = hash_hmac('sha256', "$header.$body", $secret, true);
        return "$header.$body." . base64_encode($sig);
    }

    public static function verifyToken(string $token): ?array {
        $secret = env('JWT_SECRET', 'changeme');
        $parts  = explode('.', $token);
        if (count($parts) !== 3) return null;
        [$header, $body, $sig] = $parts;
        $expected = base64_encode(hash_hmac('sha256', "$header.$body", $secret, true));
        if (!hash_equals($expected, $sig)) return null;
        $payload = json_decode(base64_decode($body), true);
        if (!$payload || $payload['exp'] < time()) return null;
        return $payload;
    }

    public static function requireAuth(): array {
        $headers = getallheaders();
        $auth    = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        if (!str_starts_with($auth, 'Bearer ')) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            exit;
        }
        $token   = substr($auth, 7);
        $payload = self::verifyToken($token);
        if (!$payload) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid or expired token']);
            exit;
        }
        return $payload;
    }

    public static function requireRole(array $user, string ...$roles): void {
        if (!in_array($user['role'], $roles, true)) {
            http_response_code(403);
            echo json_encode(['error' => 'Forbidden']);
            exit;
        }
    }
}

// CORS setup
function setCorsHeaders(): void {
    $origin = env('CORS_ORIGIN', 'http://localhost:3000');
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Content-Type: application/json; charset=UTF-8');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function jsonResponse(mixed $data, int $code = 200): void {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

function getBody(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}
