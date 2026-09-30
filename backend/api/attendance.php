<?php
// backend/api/attendance.php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/middleware/auth.php';

setCorsHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$user   = Auth::requireAuth();

match ($method) {
    'GET'  => getAttendance($user),
    'POST' => markAttendance($user),
    'PUT'  => updateAttendance($user),
    default => jsonResponse(['error' => 'Method not allowed'], 405),
};

function getAttendance(array $auth): void {
    $db = Database::getConnection();
    $courseId   = $_GET['course_id'] ?? null;
    $studentId  = $_GET['student_id'] ?? null;
    $startDate  = $_GET['start_date'] ?? date('Y-m-01');
    $endDate    = $_GET['end_date']   ?? date('Y-m-d');

    if ($auth['role'] === 'student') {
        // Students see their own attendance
        $stmt = $db->prepare("
            SELECT a.date, a.status, a.remarks, c.name as course_name, c.code as course_code,
                   u.name as teacher_name
            FROM attendance a
            JOIN enrollments e ON a.enrollment_id = e.id
            JOIN students s ON e.student_id = s.id
            JOIN courses c ON e.course_id = c.id
            JOIN teachers t ON e.teacher_id = t.id
            JOIN users u ON t.user_id = u.id
            WHERE s.user_id = ? AND a.date BETWEEN ? AND ?
            ORDER BY a.date DESC, c.name
        ");
        $stmt->execute([$auth['id'], $startDate, $endDate]);
        $records = $stmt->fetchAll();

        // Compute summary
        $total = count($records);
        $present = count(array_filter($records, fn($r) => $r['status'] === 'present'));
        $percentage = $total > 0 ? round(($present / $total) * 100, 1) : 0;

        jsonResponse(['records' => $records, 'summary' => ['total' => $total, 'present' => $present, 'percentage' => $percentage]]);
    }

    if ($auth['role'] === 'teacher') {
        if (!$courseId) jsonResponse(['error' => 'course_id required'], 422);
        $stmt = $db->prepare("
            SELECT a.id, a.date, a.status, a.remarks,
                   s.roll_number, u.name as student_name
            FROM attendance a
            JOIN enrollments e ON a.enrollment_id = e.id
            JOIN students s ON e.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE e.course_id = ? AND a.date BETWEEN ? AND ?
            ORDER BY a.date DESC, u.name
        ");
        $stmt->execute([$courseId, $startDate, $endDate]);
        jsonResponse($stmt->fetchAll());
    }

    if ($auth['role'] === 'admin') {
        $params = [$startDate, $endDate];
        $where  = 'a.date BETWEEN ? AND ?';
        if ($courseId) { $where .= ' AND e.course_id = ?'; $params[] = $courseId; }
        if ($studentId) { $where .= ' AND e.student_id = ?'; $params[] = $studentId; }
        $stmt = $db->prepare("
            SELECT a.id, a.date, a.status, c.name as course_name,
                   s.roll_number, u.name as student_name
            FROM attendance a
            JOIN enrollments e ON a.enrollment_id = e.id
            JOIN students s ON e.student_id = s.id
            JOIN users u ON s.user_id = u.id
            JOIN courses c ON e.course_id = c.id
            WHERE $where ORDER BY a.date DESC
        ");
        $stmt->execute($params);
        jsonResponse($stmt->fetchAll());
    }
}

function markAttendance(array $auth): void {
    Auth::requireRole($auth, 'admin', 'teacher');
    $body = getBody();

    if (empty($body['records']) || !is_array($body['records'])) {
        jsonResponse(['error' => 'records array required'], 422);
    }

    $db = Database::getConnection();
    $db->beginTransaction();

    try {
        foreach ($body['records'] as $rec) {
            $stmt = $db->prepare("
                INSERT INTO attendance (enrollment_id, date, status, remarks, marked_by)
                VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE status = VALUES(status), remarks = VALUES(remarks)
            ");
            $stmt->execute([
                $rec['enrollment_id'],
                $rec['date'] ?? date('Y-m-d'),
                $rec['status'] ?? 'present',
                $rec['remarks'] ?? null,
                $auth['id'],
            ]);
        }
        $db->commit();
        jsonResponse(['message' => 'Attendance marked', 'count' => count($body['records'])]);
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

function updateAttendance(array $auth): void {
    Auth::requireRole($auth, 'admin', 'teacher');
    $id   = $_GET['id'] ?? null;
    if (!$id) jsonResponse(['error' => 'id required'], 422);
    $body = getBody();
    $db   = Database::getConnection();
    $db->prepare('UPDATE attendance SET status = ?, remarks = ? WHERE id = ?')
       ->execute([$body['status'], $body['remarks'] ?? null, $id]);
    jsonResponse(['message' => 'Attendance updated']);
}
