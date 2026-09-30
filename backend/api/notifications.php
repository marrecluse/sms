<?php
// backend/api/notifications.php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/middleware/auth.php';

setCorsHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$user   = Auth::requireAuth();
$action = $_GET['action'] ?? null;

if ($action === 'read') { markRead($user); return; }

match ($method) {
    'GET'  => listNotifications($user),
    'POST' => createNotification($user),
    default => jsonResponse(['error' => 'Method not allowed'], 405),
};

function listNotifications(array $auth): void {
    $db = Database::getConnection();

    // For students, get their student.id so we can check course/semester targeting
    $studentId = null;
    if ($auth['role'] === 'student') {
        $s = $db->prepare('SELECT id FROM students WHERE user_id = ?');
        $s->execute([$auth['id']]);
        $row = $s->fetch();
        $studentId = $row ? $row['id'] : 0;
    }

    $stmt = $db->prepare("
        SELECT DISTINCT n.id, n.title, n.message, n.type, n.target_role,
               n.target_user_id, n.target_course_id, n.target_semester_id,
               n.created_at, u.name as sender_name,
               IF(nr.id IS NULL, 0, 1) as is_read
        FROM notifications n
        JOIN users u ON n.sender_id = u.id
        LEFT JOIN notification_reads nr ON nr.notification_id = n.id AND nr.user_id = :uid
        LEFT JOIN enrollments e ON (
            (n.target_course_id IS NOT NULL AND e.course_id = n.target_course_id AND e.student_id = :sid)
            OR
            (n.target_semester_id IS NOT NULL AND e.semester_id = n.target_semester_id AND e.student_id = :sid2)
        )
        WHERE
            n.target_role = 'all'
            OR n.target_role = :role
            OR n.target_user_id = :uid2
            OR (n.target_course_id IS NOT NULL AND e.id IS NOT NULL)
            OR (n.target_semester_id IS NOT NULL AND e.id IS NOT NULL)
        ORDER BY n.created_at DESC
        LIMIT 50
    ");
    $stmt->execute([
        ':uid'   => $auth['id'],
        ':uid2'  => $auth['id'],
        ':role'  => $auth['role'],
        ':sid'   => $studentId ?? 0,
        ':sid2'  => $studentId ?? 0,
    ]);
    $notifications = $stmt->fetchAll();

    $unread = count(array_filter($notifications, fn($n) => !$n['is_read']));
    jsonResponse(['notifications' => $notifications, 'unread_count' => $unread]);
}

function createNotification(array $auth): void {
    Auth::requireRole($auth, 'admin', 'teacher');
    $body = getBody();
    if (empty($body['title']) || empty($body['message'])) {
        jsonResponse(['error' => 'title and message required'], 422);
    }
    $db = Database::getConnection();

    $targetRole       = $body['target_role'] ?? 'all';
    $targetUserId     = !empty($body['target_user_id'])     ? (int)$body['target_user_id']     : null;
    $targetCourseId   = !empty($body['target_course_id'])   ? (int)$body['target_course_id']   : null;
    $targetSemesterId = !empty($body['target_semester_id']) ? (int)$body['target_semester_id'] : null;

    $db->prepare('INSERT INTO notifications (sender_id, title, message, type, target_role, target_user_id, target_course_id, target_semester_id) VALUES (?,?,?,?,?,?,?,?)')
       ->execute([
           $auth['id'], $body['title'], $body['message'],
           $body['type'] ?? 'general',
           $targetRole, $targetUserId, $targetCourseId, $targetSemesterId
       ]);

    jsonResponse(['message' => 'Notification sent', 'id' => $db->lastInsertId()], 201);
}

function markRead(array $auth): void {
    $notifId = $_GET['id'] ?? null;
    $db      = Database::getConnection();
    if ($notifId) {
        $db->prepare('INSERT IGNORE INTO notification_reads (notification_id, user_id) VALUES (?,?)')
           ->execute([$notifId, $auth['id']]);
    } else {
        // Mark all visible notifications as read
        $stmt = $db->prepare("SELECT id FROM notifications WHERE target_role = 'all' OR target_role = ? OR target_user_id = ?");
        $stmt->execute([$auth['role'], $auth['id']]);
        $ids = $stmt->fetchAll(PDO::FETCH_COLUMN);
        foreach ($ids as $id) {
            $db->prepare('INSERT IGNORE INTO notification_reads (notification_id, user_id) VALUES (?,?)')
               ->execute([$id, $auth['id']]);
        }
    }
    jsonResponse(['message' => 'Marked as read']);
}
