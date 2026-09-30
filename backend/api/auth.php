<?php
// backend/api/auth.php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/middleware/auth.php';

setCorsHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

match ($action) {
    'login'   => handleLogin(),
    'logout'  => handleLogout(),
    'me'      => handleMe(),
    'refresh' => handleRefresh(),
    default   => jsonResponse(['error' => 'Unknown action'], 404),
};

function handleLogin(): void {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(['error' => 'Method not allowed'], 405);
    }
    $body  = getBody();
    $email = trim($body['email'] ?? '');
    $pass  = $body['password'] ?? '';

    if (!$email || !$pass) {
        jsonResponse(['error' => 'Email and password are required'], 422);
    }

    $db   = Database::getConnection();
    $stmt = $db->prepare('SELECT u.*, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = ? AND u.is_active = 1');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($pass, $user['password'])) {
        jsonResponse(['error' => 'Invalid credentials'], 401);
    }

    $token = Auth::generateToken([
        'id'    => $user['id'],
        'name'  => $user['name'],
        'email' => $user['email'],
        'role'  => $user['role'],
    ]);

    jsonResponse([
        'token' => $token,
        'user'  => [
            'id'              => $user['id'],
            'name'            => $user['name'],
            'email'           => $user['email'],
            'role'            => $user['role'],
            'profile_picture' => $user['profile_picture'],
        ]
    ]);
}

function handleMe(): void {
    $user = Auth::requireAuth();
    $db   = Database::getConnection();
    $stmt = $db->prepare('SELECT u.id, u.name, u.email, u.phone, u.address, u.profile_picture, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?');
    $stmt->execute([$user['id']]);
    $data = $stmt->fetch();
    if (!$data) jsonResponse(['error' => 'User not found'], 404);
    jsonResponse($data);
}

function handleLogout(): void {
    // JWT is stateless; client must discard token
    jsonResponse(['message' => 'Logged out successfully']);
}

function handleRefresh(): void {
    $user  = Auth::requireAuth();
    $token = Auth::generateToken([
        'id'    => $user['id'],
        'name'  => $user['name'],
        'email' => $user['email'],
        'role'  => $user['role'],
    ]);
    jsonResponse(['token' => $token]);
}
