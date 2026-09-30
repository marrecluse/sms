<?php
// backend/api/users.php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/middleware/auth.php';

setCorsHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$id     = $_GET['id'] ?? null;
$action = $_GET['action'] ?? 'list';
$user   = Auth::requireAuth();

// Handle avatar upload (JSON base64)
if ($method === 'POST' && $action === 'upload_avatar') {
    uploadAvatar($id, $user);
    exit;
}

match ($method) {
    'GET'    => $id ? getUser($id, $user) : listUsers($user),
    'POST'   => createUser($user),
    'PUT'    => updateUser($id, $user),
    'DELETE' => deleteUser($id, $user),
    default  => jsonResponse(['error' => 'Method not allowed'], 405),
};

function listUsers(array $auth): void {
    // Librarians can list students (needed for book issuing dropdown)
    if ($auth['role'] === 'librarian') {
        $role = $_GET['role'] ?? null;
        if ($role !== 'student') jsonResponse(['error' => 'Forbidden'], 403);
        $db = Database::getConnection();
        $stmt = $db->prepare('
            SELECT u.id, u.name, u.email, u.phone, u.is_active, u.profile_picture, r.name as role,
                   s.id as student_id, s.roll_number
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN students s ON s.user_id = u.id
            WHERE r.name = ?
            ORDER BY u.name ASC
        ');
        $stmt->execute(['student']);
        jsonResponse($stmt->fetchAll());
        return;
    }
    Auth::requireRole($auth, 'admin');
    $db   = Database::getConnection();
    $role = $_GET['role'] ?? null;
    if ($role === 'student') {
        // Also return students.id as student_id — required for library book issuing (FK to students table)
        $stmt = $db->prepare('
            SELECT u.id, u.name, u.email, u.phone, u.is_active, u.profile_picture, u.created_at, r.name as role,
                   s.id as student_id, s.roll_number
            FROM users u
            JOIN roles r ON u.role_id = r.id
            LEFT JOIN students s ON s.user_id = u.id
            WHERE r.name = ?
            ORDER BY u.created_at DESC
        ');
        $stmt->execute([$role]);
    } elseif ($role) {
        $stmt = $db->prepare('SELECT u.id, u.name, u.email, u.phone, u.is_active, u.profile_picture, u.created_at, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = ? ORDER BY u.created_at DESC');
        $stmt->execute([$role]);
    } else {
        $stmt = $db->query('SELECT u.id, u.name, u.email, u.phone, u.is_active, u.profile_picture, u.created_at, r.name as role FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.name ASC');
    }
    jsonResponse($stmt->fetchAll());
}

function getUser(string $id, array $auth): void {
    if ($auth['role'] !== 'admin' && $auth['id'] != $id) {
        jsonResponse(['error' => 'Forbidden'], 403);
    }
    $db   = Database::getConnection();
    $stmt = $db->prepare('SELECT u.id, u.name, u.email, u.phone, u.address, u.profile_picture, u.is_active, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?');
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user) jsonResponse(['error' => 'User not found'], 404);
    jsonResponse($user);
}

function createUser(array $auth): void {
    Auth::requireRole($auth, 'admin');
    $body = getBody();
    $required = ['name','email','password','role'];
    foreach ($required as $f) {
        if (empty($body[$f])) jsonResponse(['error' => "Field '$f' is required"], 422);
    }
    $db = Database::getConnection();

    // Check email uniqueness
    $stmt = $db->prepare('SELECT id FROM users WHERE email = ?');
    $stmt->execute([$body['email']]);
    if ($stmt->fetch()) jsonResponse(['error' => 'Email already registered'], 409);

    $roleStmt = $db->prepare('SELECT id FROM roles WHERE name = ?');
    $roleStmt->execute([$body['role']]);
    $role = $roleStmt->fetch();
    if (!$role) jsonResponse(['error' => 'Invalid role'], 422);

    $hashed = password_hash($body['password'], PASSWORD_BCRYPT, ['cost' => (int) env('BCRYPT_ROUNDS', 12)]);

    $db->prepare('INSERT INTO users (name, email, password, role_id, phone, address) VALUES (?,?,?,?,?,?)')
       ->execute([$body['name'], $body['email'], $hashed, $role['id'], $body['phone'] ?? null, $body['address'] ?? null]);

    $newId = $db->lastInsertId();

    // Create profile record based on role
    if ($body['role'] === 'student') {
        $db->prepare('INSERT INTO students (user_id, roll_number, program_id, batch_year) VALUES (?,?,?,?)')
           ->execute([$newId, $body['roll_number'] ?? 'TEMP-'.$newId, $body['program_id'] ?? 1, $body['batch_year'] ?? date('Y')]);
    } elseif ($body['role'] === 'teacher') {
        $db->prepare('INSERT INTO teachers (user_id, employee_id, department_id) VALUES (?,?,?)')
           ->execute([$newId, $body['employee_id'] ?? 'EMP-'.$newId, $body['department_id'] ?? 1]);
    }

    jsonResponse(['message' => 'User created', 'id' => $newId], 201);
}

function updateUser(string $id, array $auth): void {
    if ($auth['role'] !== 'admin' && $auth['id'] != $id) {
        jsonResponse(['error' => 'Forbidden'], 403);
    }
    $body = getBody();
    $db   = Database::getConnection();

    $fields = [];
    $vals   = [];
    $allowed = ['name','phone','address','is_active'];
    foreach ($allowed as $f) {
        if (isset($body[$f])) {
            $fields[] = "$f = ?";
            $vals[]   = $body[$f];
        }
    }
    if (isset($body['password']) && $auth['role'] === 'admin') {
        $fields[] = "password = ?";
        $vals[]   = password_hash($body['password'], PASSWORD_BCRYPT);
    }
    if (empty($fields)) jsonResponse(['error' => 'Nothing to update'], 422);

    $vals[] = $id;
    $db->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?')->execute($vals);
    jsonResponse(['message' => 'User updated']);
}

function deleteUser(string $id, array $auth): void {
    Auth::requireRole($auth, 'admin');
    if ($auth['id'] == $id) jsonResponse(['error' => 'Cannot delete yourself'], 422);
    $db = Database::getConnection();
    $db->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
    jsonResponse(['message' => 'User deleted']);
}

function uploadAvatar(?string $id, array $auth): void {
    if (!$id) jsonResponse(['error' => 'User ID required'], 422);
    if ($auth['role'] !== 'admin' && $auth['id'] != $id) {
        jsonResponse(['error' => 'Forbidden'], 403);
    }

    $body    = getBody();
    $base64  = $body['image']     ?? null;
    $mime    = $body['mime_type'] ?? null;

    if (!$base64) jsonResponse(['error' => 'No image provided'], 422);

    $allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!in_array($mime, $allowed)) {
        jsonResponse(['error' => 'Invalid file type. Allowed: JPG, PNG, GIF, WEBP'], 422);
    }

    $decoded = base64_decode($base64, true);
    if ($decoded === false) jsonResponse(['error' => 'Invalid image data'], 422);

    // Verify by magic bytes (don't trust client-supplied MIME)
    $actualMime = null;
    if (str_starts_with($decoded, "\xFF\xD8"))                        $actualMime = 'image/jpeg';
    elseif (str_starts_with($decoded, "\x89PNG\r\n\x1a\n"))          $actualMime = 'image/png';
    elseif (str_starts_with($decoded, 'GIF87a') || str_starts_with($decoded, 'GIF89a')) $actualMime = 'image/gif';
    elseif (str_starts_with($decoded, 'RIFF') && substr($decoded, 8, 4) === 'WEBP')    $actualMime = 'image/webp';

    if (!$actualMime) jsonResponse(['error' => 'Invalid image file'], 422);

    // Max 5 MB
    if (strlen($decoded) > 5 * 1024 * 1024) {
        jsonResponse(['error' => 'File too large. Max 5 MB'], 422);
    }

    $ext       = ['image/jpeg'=>'jpg','image/png'=>'png','image/gif'=>'gif','image/webp'=>'webp'][$actualMime];
    $uploadDir = dirname(__DIR__) . '/uploads/avatars/';
    if (!is_dir($uploadDir)) mkdir($uploadDir, 0755, true);

    // Remove old avatar
    $db   = Database::getConnection();
    $stmt = $db->prepare('SELECT profile_picture FROM users WHERE id = ?');
    $stmt->execute([$id]);
    $row  = $stmt->fetch();
    if ($row && $row['profile_picture']) {
        $oldPath = $uploadDir . basename($row['profile_picture']);
        if (file_exists($oldPath)) @unlink($oldPath);
    }

    $filename = 'avatar_' . $id . '_' . time() . '.' . $ext;
    $dest     = $uploadDir . $filename;

    if (file_put_contents($dest, $decoded) === false) {
        jsonResponse(['error' => 'Failed to save file'], 500);
    }

    $url = '/uploads/avatars/' . $filename;
    $db->prepare('UPDATE users SET profile_picture = ? WHERE id = ?')->execute([$url, $id]);

    jsonResponse(['message' => 'Avatar uploaded', 'url' => $url]);
}
