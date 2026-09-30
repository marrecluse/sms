<?php
// backend/api/courses.php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/middleware/auth.php';

setCorsHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$user   = Auth::requireAuth();
$id     = $_GET['id'] ?? null;

match ($method) {
    'GET'    => $id ? getCourse($id) : listCourses($user),
    'POST'   => createCourse($user),
    'PUT'    => updateCourse($id, $user),
    'DELETE' => deleteCourse($id, $user),
    default  => jsonResponse(['error' => 'Method not allowed'], 405),
};

function listCourses(array $auth): void {
    $db = Database::getConnection();

    if ($auth['role'] === 'teacher') {
        // Return courses assigned to this teacher
        $stmt = $db->prepare("
            SELECT DISTINCT c.id, c.name, c.code, c.credit_hours, c.description,
                   p.name as program_name,
                   COUNT(DISTINCT e.student_id) as enrolled_students
            FROM courses c
            JOIN programs p ON c.program_id = p.id
            JOIN enrollments e ON e.course_id = c.id
            JOIN teachers t ON e.teacher_id = t.id
            WHERE t.user_id = ?
            GROUP BY c.id
            ORDER BY c.name
        ");
        $stmt->execute([$auth['id']]);
    } elseif ($auth['role'] === 'student') {
        // Return courses this student is enrolled in
        $stmt = $db->prepare("
            SELECT c.id, c.name, c.code, c.credit_hours, c.description,
                   p.name as program_name,
                   u.name as teacher_name,
                   sm.name as semester_name
            FROM courses c
            JOIN programs p ON c.program_id = p.id
            JOIN enrollments e ON e.course_id = c.id
            JOIN students s ON e.student_id = s.id
            JOIN teachers t ON e.teacher_id = t.id
            JOIN users u ON t.user_id = u.id
            JOIN semesters sm ON e.semester_id = sm.id
            WHERE s.user_id = ?
            ORDER BY c.name
        ");
        $stmt->execute([$auth['id']]);
    } else {
        // Admin sees all
        $stmt = $db->query("
            SELECT c.id, c.name, c.code, c.credit_hours, c.description,
                   p.name as program_name,
                   COUNT(DISTINCT e.student_id) as enrolled_students
            FROM courses c
            JOIN programs p ON c.program_id = p.id
            LEFT JOIN enrollments e ON e.course_id = c.id
            GROUP BY c.id
            ORDER BY c.name
        ");
    }
    jsonResponse($stmt->fetchAll());
}

function getCourse(string $id): void {
    $db   = Database::getConnection();
    $stmt = $db->prepare("
        SELECT c.*, p.name as program_name
        FROM courses c JOIN programs p ON c.program_id = p.id
        WHERE c.id = ?
    ");
    $stmt->execute([$id]);
    $course = $stmt->fetch();
    if (!$course) jsonResponse(['error' => 'Course not found'], 404);
    jsonResponse($course);
}

function createCourse(array $auth): void {
    Auth::requireRole($auth, 'admin');
    $body = getBody();
    foreach (['name','code','program_id'] as $f) {
        if (empty($body[$f])) jsonResponse(['error' => "$f is required"], 422);
    }
    $db = Database::getConnection();
    $db->prepare('INSERT INTO courses (program_id, name, code, credit_hours, description) VALUES (?,?,?,?,?)')
       ->execute([$body['program_id'], $body['name'], $body['code'], $body['credit_hours'] ?? 3, $body['description'] ?? null]);
    jsonResponse(['message' => 'Course created', 'id' => $db->lastInsertId()], 201);
}

function updateCourse(string $id, array $auth): void {
    Auth::requireRole($auth, 'admin');
    $body = getBody();
    $db   = Database::getConnection();
    $db->prepare('UPDATE courses SET name=?, code=?, credit_hours=?, description=? WHERE id=?')
       ->execute([$body['name'], $body['code'], $body['credit_hours'] ?? 3, $body['description'] ?? null, $id]);
    jsonResponse(['message' => 'Course updated']);
}

function deleteCourse(string $id, array $auth): void {
    Auth::requireRole($auth, 'admin');
    $db = Database::getConnection();
    $db->prepare('DELETE FROM courses WHERE id = ?')->execute([$id]);
    jsonResponse(['message' => 'Course deleted']);
}
