<?php
// backend/api/assignments.php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/middleware/auth.php';

setCorsHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$user   = Auth::requireAuth();
$id     = $_GET['id'] ?? null;
$action = $_GET['action'] ?? null;

if ($action === 'submit') { submitAssignment($user); return; }
if ($action === 'grade')  { gradeSubmission($user); return; }

match ($method) {
    'GET'    => $id ? getAssignment($id, $user) : listAssignments($user),
    'POST'   => createAssignment($user),
    'PUT'    => updateAssignment($id, $user),
    'DELETE' => deleteAssignment($id, $user),
    default  => jsonResponse(['error' => 'Method not allowed'], 405),
};

function listAssignments(array $auth): void {
    $db = Database::getConnection();
    $courseId = $_GET['course_id'] ?? null;

    if ($auth['role'] === 'student') {
        $stmt = $db->prepare("
            SELECT a.id, a.title, a.description, a.total_marks, a.due_date,
                   c.name as course_name, c.code as course_code,
                   u.name as teacher_name,
                   sub.id as submission_id, sub.status as submission_status,
                   sub.marks_obtained, sub.submitted_at
            FROM assignments a
            JOIN courses c ON a.course_id = c.id
            JOIN teachers t ON a.teacher_id = t.id
            JOIN users u ON t.user_id = u.id
            JOIN enrollments e ON e.course_id = a.course_id AND e.semester_id = a.semester_id
            JOIN students s ON e.student_id = s.id
            LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id AND sub.student_id = s.id
            WHERE s.user_id = ? AND a.is_published = 1
            ORDER BY a.due_date ASC
        ");
        $stmt->execute([$auth['id']]);
    } elseif ($auth['role'] === 'teacher') {
        $params = [];
        $where  = 't.user_id = ?';
        $params[] = $auth['id'];
        if ($courseId) { $where .= ' AND a.course_id = ?'; $params[] = $courseId; }
        $stmt = $db->prepare("
            SELECT a.id, a.title, a.description, a.total_marks, a.due_date, a.is_published,
                   c.name as course_name,
                   COUNT(sub.id) as submissions_count
            FROM assignments a
            JOIN courses c ON a.course_id = c.id
            JOIN teachers t ON a.teacher_id = t.id
            LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id
            WHERE $where
            GROUP BY a.id ORDER BY a.created_at DESC
        ");
        $stmt->execute($params);
    } else {
        $stmt = $db->query("
            SELECT a.id, a.title, a.total_marks, a.due_date, a.is_published,
                   c.name as course_name, u.name as teacher_name,
                   COUNT(sub.id) as submissions_count
            FROM assignments a
            JOIN courses c ON a.course_id = c.id
            JOIN teachers t ON a.teacher_id = t.id
            JOIN users u ON t.user_id = u.id
            LEFT JOIN assignment_submissions sub ON sub.assignment_id = a.id
            GROUP BY a.id ORDER BY a.created_at DESC
        ");
    }
    jsonResponse($stmt->fetchAll());
}

function getAssignment(string $id, array $auth): void {
    $db   = Database::getConnection();
    $stmt = $db->prepare("
        SELECT a.*, c.name as course_name, u.name as teacher_name
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN teachers t ON a.teacher_id = t.id
        JOIN users u ON t.user_id = u.id
        WHERE a.id = ?
    ");
    $stmt->execute([$id]);
    $assignment = $stmt->fetch();
    if (!$assignment) jsonResponse(['error' => 'Assignment not found'], 404);

    // Load submissions for teachers/admin
    if (in_array($auth['role'], ['teacher','admin'])) {
        $subStmt = $db->prepare("
            SELECT sub.*, s.roll_number, u.name as student_name
            FROM assignment_submissions sub
            JOIN students s ON sub.student_id = s.id
            JOIN users u ON s.user_id = u.id
            WHERE sub.assignment_id = ?
        ");
        $subStmt->execute([$id]);
        $assignment['submissions'] = $subStmt->fetchAll();
    }
    jsonResponse($assignment);
}

function createAssignment(array $auth): void {
    Auth::requireRole($auth, 'admin', 'teacher');
    $body = getBody();
    $required = ['title','course_id','semester_id','due_date','total_marks'];
    foreach ($required as $f) if (empty($body[$f])) jsonResponse(['error' => "$f is required"], 422);

    $db = Database::getConnection();

    // Get teacher_id from user
    if ($auth['role'] === 'teacher') {
        $tStmt = $db->prepare('SELECT id FROM teachers WHERE user_id = ?');
        $tStmt->execute([$auth['id']]);
        $teacher = $tStmt->fetch();
        if (!$teacher) jsonResponse(['error' => 'Teacher profile not found'], 404);
        $teacherId = $teacher['id'];
    } else {
        // Admin must explicitly provide teacher_id
        if (empty($body['teacher_id'])) jsonResponse(['error' => 'teacher_id is required when admin creates an assignment'], 422);
        $teacherId = (int) $body['teacher_id'];
        // Verify teacher exists
        $tStmt = $db->prepare('SELECT id FROM teachers WHERE id = ?');
        $tStmt->execute([$teacherId]);
        if (!$tStmt->fetch()) jsonResponse(['error' => 'Specified teacher not found'], 404);
    }

    $db->prepare('INSERT INTO assignments (course_id, teacher_id, semester_id, title, description, total_marks, due_date, is_published) VALUES (?,?,?,?,?,?,?,?)')
       ->execute([
           $body['course_id'], $teacherId, $body['semester_id'],
           $body['title'], $body['description'] ?? null,
           $body['total_marks'], $body['due_date'],
           $body['is_published'] ?? 1,
       ]);
    jsonResponse(['message' => 'Assignment created', 'id' => $db->lastInsertId()], 201);
}

function updateAssignment(string $id, array $auth): void {
    Auth::requireRole($auth, 'admin', 'teacher');
    $body = getBody();
    $db   = Database::getConnection();
    $db->prepare('UPDATE assignments SET title=?, description=?, total_marks=?, due_date=?, is_published=? WHERE id=?')
       ->execute([$body['title'], $body['description'], $body['total_marks'], $body['due_date'], $body['is_published'], $id]);
    jsonResponse(['message' => 'Assignment updated']);
}

function deleteAssignment(string $id, array $auth): void {
    Auth::requireRole($auth, 'admin', 'teacher');
    $db = Database::getConnection();
    $db->prepare('DELETE FROM assignments WHERE id = ?')->execute([$id]);
    jsonResponse(['message' => 'Assignment deleted']);
}

function submitAssignment(array $auth): void {
    Auth::requireRole($auth, 'student');
    $body = getBody();
    if (empty($body['assignment_id'])) jsonResponse(['error' => 'assignment_id required'], 422);

    $db = Database::getConnection();
    $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
    $sStmt->execute([$auth['id']]);
    $student = $sStmt->fetch();
    if (!$student) jsonResponse(['error' => 'Student profile not found'], 404);

    $db->prepare('INSERT INTO assignment_submissions (assignment_id, student_id, text_content, status) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE text_content=VALUES(text_content), submitted_at=NOW(), status="submitted"')
       ->execute([$body['assignment_id'], $student['id'], $body['text_content'] ?? null, 'submitted']);
    jsonResponse(['message' => 'Assignment submitted'], 201);
}

function gradeSubmission(array $auth): void {
    Auth::requireRole($auth, 'admin', 'teacher');
    $subId = $_GET['submission_id'] ?? null;
    if (!$subId) jsonResponse(['error' => 'submission_id required'], 422);
    $body  = getBody();
    $db    = Database::getConnection();
    $db->prepare('UPDATE assignment_submissions SET marks_obtained=?, feedback=?, graded_at=NOW(), graded_by=?, status="graded" WHERE id=?')
       ->execute([$body['marks_obtained'], $body['feedback'] ?? null, $auth['id'], $subId]);
    jsonResponse(['message' => 'Submission graded']);
}