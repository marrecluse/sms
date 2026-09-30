<?php
// backend/api/academic.php
// Handles departments, programs, semesters, courses, enrollments
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/middleware/auth.php';

setCorsHeaders();
$user   = Auth::requireAuth();
$entity = $_GET['entity'] ?? '';
$method = $_SERVER['REQUEST_METHOD'];
$id     = $_GET['id'] ?? null;

match ($entity) {
    'departments' => handleDepartments($method, $id, $user),
    'programs'    => handlePrograms($method, $id, $user),
    'semesters'   => handleSemesters($method, $id, $user),
    'courses'     => handleCourses($method, $id, $user),
    'enrollments' => handleEnrollments($method, $id, $user),
    'stats'       => handleStats($user),
    default       => jsonResponse(['error' => 'Unknown entity'], 404),
};

// ── DEPARTMENTS ───────────────────────────────────────────
function handleDepartments(string $method, ?string $id, array $user): void {
    $db = Database::getConnection();
    if ($method === 'GET') {
        if ($id) {
            $stmt = $db->prepare('SELECT d.*, COUNT(DISTINCT p.id) as programs_count FROM departments d LEFT JOIN programs p ON p.department_id = d.id WHERE d.id = ? GROUP BY d.id');
            $stmt->execute([$id]);
            jsonResponse($stmt->fetch() ?: ['error' => 'Not found']);
        }
        $stmt = $db->query('SELECT d.*, COUNT(DISTINCT p.id) as programs_count, COUNT(DISTINCT t.id) as teachers_count FROM departments d LEFT JOIN programs p ON p.department_id = d.id LEFT JOIN teachers t ON t.department_id = d.id GROUP BY d.id ORDER BY d.name');
        jsonResponse($stmt->fetchAll());
    }
    Auth::requireRole($user, 'admin');
    if ($method === 'POST') {
        $body = getBody();
        if (empty($body['name']) || empty($body['code'])) jsonResponse(['error' => 'name and code required'], 422);
        $db->prepare('INSERT INTO departments (name, code) VALUES (?,?)')->execute([$body['name'], strtoupper($body['code'])]);
        jsonResponse(['message' => 'Department created', 'id' => $db->lastInsertId()], 201);
    }
    if ($method === 'PUT') {
        $body = getBody();
        $db->prepare('UPDATE departments SET name=?, code=? WHERE id=?')->execute([$body['name'], strtoupper($body['code']), $id]);
        jsonResponse(['message' => 'Updated']);
    }
    if ($method === 'DELETE') {
        $pCount = $db->prepare('SELECT COUNT(*) FROM programs WHERE department_id = ?');
        $pCount->execute([$id]);
        if ($pCount->fetchColumn() > 0) jsonResponse(['error' => 'Cannot delete department that has programs. Remove programs first.'], 409);
        $tCount = $db->prepare('SELECT COUNT(*) FROM teachers WHERE department_id = ?');
        $tCount->execute([$id]);
        if ($tCount->fetchColumn() > 0) jsonResponse(['error' => 'Cannot delete department that has assigned teachers.'], 409);
        $db->prepare('DELETE FROM departments WHERE id=?')->execute([$id]);
        jsonResponse(['message' => 'Deleted']);
    }
}

// ── PROGRAMS ─────────────────────────────────────────────
function handlePrograms(string $method, ?string $id, array $user): void {
    $db = Database::getConnection();
    if ($method === 'GET') {
        $deptId = $_GET['department_id'] ?? null;
        $where  = $deptId ? 'WHERE p.department_id = ?' : '';
        $params = $deptId ? [$deptId] : [];
        $stmt = $db->prepare("SELECT p.*, d.name as department_name, COUNT(DISTINCT c.id) as courses_count, COUNT(DISTINCT s.id) as students_count FROM programs p JOIN departments d ON p.department_id = d.id LEFT JOIN courses c ON c.program_id = p.id LEFT JOIN students s ON s.program_id = p.id $where GROUP BY p.id ORDER BY p.name");
        $stmt->execute($params);
        jsonResponse($stmt->fetchAll());
    }
    Auth::requireRole($user, 'admin');
    if ($method === 'POST') {
        $body = getBody();
        $db->prepare('INSERT INTO programs (department_id, name, code, duration_years) VALUES (?,?,?,?)')->execute([$body['department_id'], $body['name'], strtoupper($body['code']), $body['duration_years'] ?? 4]);
        jsonResponse(['message' => 'Program created', 'id' => $db->lastInsertId()], 201);
    }
    if ($method === 'PUT') {
        $body = getBody();
        $db->prepare('UPDATE programs SET name=?, code=?, duration_years=? WHERE id=?')->execute([$body['name'], strtoupper($body['code']), $body['duration_years'] ?? 4, $id]);
        jsonResponse(['message' => 'Updated']);
    }
    if ($method === 'DELETE') {
        $cCount = $db->prepare('SELECT COUNT(*) FROM courses WHERE program_id = ?');
        $cCount->execute([$id]);
        if ($cCount->fetchColumn() > 0) jsonResponse(['error' => 'Cannot delete program that has courses. Remove courses first.'], 409);
        $sCount = $db->prepare('SELECT COUNT(*) FROM students WHERE program_id = ?');
        $sCount->execute([$id]);
        if ($sCount->fetchColumn() > 0) jsonResponse(['error' => 'Cannot delete program that has enrolled students.'], 409);
        $db->prepare('DELETE FROM programs WHERE id=?')->execute([$id]);
        jsonResponse(['message' => 'Deleted']);
    }
}

// ── SEMESTERS ─────────────────────────────────────────────
function handleSemesters(string $method, ?string $id, array $user): void {
    $db = Database::getConnection();
    if ($method === 'GET') {
        $stmt = $db->query('SELECT s.*, COUNT(DISTINCT e.id) as enrollments FROM semesters s LEFT JOIN enrollments e ON e.semester_id = s.id GROUP BY s.id ORDER BY s.start_date DESC');
        jsonResponse($stmt->fetchAll());
    }
    Auth::requireRole($user, 'admin');
    if ($method === 'POST') {
        $body = getBody();
        if ($body['is_current'] ?? false) $db->exec('UPDATE semesters SET is_current = 0');
        $db->prepare('INSERT INTO semesters (name, start_date, end_date, is_current) VALUES (?,?,?,?)')->execute([$body['name'], $body['start_date'], $body['end_date'], $body['is_current'] ?? 0]);
        jsonResponse(['message' => 'Semester created', 'id' => $db->lastInsertId()], 201);
    }
    if ($method === 'PUT') {
        $body = getBody();
        if ($body['is_current'] ?? false) $db->exec('UPDATE semesters SET is_current = 0');
        $db->prepare('UPDATE semesters SET name=?, start_date=?, end_date=?, is_current=? WHERE id=?')->execute([$body['name'], $body['start_date'], $body['end_date'], $body['is_current'] ?? 0, $id]);
        jsonResponse(['message' => 'Updated']);
    }
    if ($method === 'DELETE') {
        $eCount = $db->prepare('SELECT COUNT(*) FROM enrollments WHERE semester_id = ?');
        $eCount->execute([$id]);
        if ($eCount->fetchColumn() > 0) jsonResponse(['error' => 'Cannot delete semester with active enrollments. Unenroll students first.'], 409);
        $db->prepare('DELETE FROM semesters WHERE id=?')->execute([$id]);
        jsonResponse(['message' => 'Deleted']);
    }
}

// ── COURSES ───────────────────────────────────────────────
function handleCourses(string $method, ?string $id, array $user): void {
    $db = Database::getConnection();
    if ($method === 'GET') {
        if ($id) {
            $stmt = $db->prepare('SELECT c.*, p.name as program_name FROM courses c JOIN programs p ON c.program_id = p.id WHERE c.id = ?');
            $stmt->execute([$id]);
            jsonResponse($stmt->fetch() ?: ['error' => 'Not found']);
        }
        $programId = $_GET['program_id'] ?? null;
        $where  = $programId ? 'WHERE c.program_id = ?' : '';
        $params = $programId ? [$programId] : [];
        $stmt = $db->prepare("SELECT c.*, p.name as program_name, d.name as dept_name, ut.name as teacher_name, COUNT(DISTINCT e.id) as enrolled_count FROM courses c JOIN programs p ON c.program_id = p.id JOIN departments d ON p.department_id = d.id LEFT JOIN enrollments e ON e.course_id = c.id LEFT JOIN teachers t ON c.teacher_id = t.id LEFT JOIN users ut ON t.user_id = ut.id $where GROUP BY c.id ORDER BY c.name");
        $stmt->execute($params);
        jsonResponse($stmt->fetchAll());
    }
    Auth::requireRole($user, 'admin');
    if ($method === 'POST') {
        $body = getBody();
        $teacherId = !empty($body['teacher_id']) ? $body['teacher_id'] : null;
        $db->prepare('INSERT INTO courses (program_id, name, code, credit_hours, description, teacher_id) VALUES (?,?,?,?,?,?)')->execute([$body['program_id'], $body['name'], strtoupper($body['code']), $body['credit_hours'] ?? 3, $body['description'] ?? null, $teacherId]);
        jsonResponse(['message' => 'Course created', 'id' => $db->lastInsertId()], 201);
    }
    if ($method === 'PUT') {
        $body = getBody();
        $teacherId = !empty($body['teacher_id']) ? $body['teacher_id'] : null;
        $db->prepare('UPDATE courses SET name=?, credit_hours=?, description=?, teacher_id=? WHERE id=?')->execute([$body['name'], $body['credit_hours'] ?? 3, $body['description'] ?? null, $teacherId, $id]);
        jsonResponse(['message' => 'Updated']);
    }
    if ($method === 'DELETE') {
        $eCount = $db->prepare('SELECT COUNT(*) FROM enrollments WHERE course_id = ?');
        $eCount->execute([$id]);
        if ($eCount->fetchColumn() > 0) jsonResponse(['error' => 'Cannot delete course with active enrollments. Unenroll students first.'], 409);
        $db->prepare('DELETE FROM courses WHERE id=?')->execute([$id]);
        jsonResponse(['message' => 'Deleted']);
    }
}

// ── ENROLLMENTS ───────────────────────────────────────────
function handleEnrollments(string $method, ?string $id, array $user): void {
    $db = Database::getConnection();
    if ($method === 'GET') {
        $courseId   = $_GET['course_id']   ?? null;
        $studentId  = $_GET['student_id']  ?? null;
        $semesterId = $_GET['semester_id'] ?? null;
        $where = ['1=1']; $params = [];
        if ($courseId)   { $where[] = 'e.course_id = ?';   $params[] = $courseId; }
        if ($studentId)  { $where[] = 'e.student_id = ?';  $params[] = $studentId; }
        if ($semesterId) { $where[] = 'e.semester_id = ?'; $params[] = $semesterId; }
        $stmt = $db->prepare('SELECT e.id, e.enrolled_at, c.name as course_name, c.code as course_code, c.credit_hours, u.name as student_name, s.roll_number, sm.name as semester, ut.name as teacher_name FROM enrollments e JOIN courses c ON e.course_id = c.id JOIN students s ON e.student_id = s.id JOIN users u ON s.user_id = u.id JOIN semesters sm ON e.semester_id = sm.id JOIN teachers t ON e.teacher_id = t.id JOIN users ut ON t.user_id = ut.id WHERE ' . implode(' AND ', $where) . ' ORDER BY u.name');
        $stmt->execute($params);
        jsonResponse($stmt->fetchAll());
    }
    Auth::requireRole($user, 'admin', 'teacher');
    if ($method === 'POST') {
        $body = getBody();
        $db->prepare('INSERT IGNORE INTO enrollments (student_id, course_id, semester_id, teacher_id) VALUES (?,?,?,?)')->execute([$body['student_id'], $body['course_id'], $body['semester_id'], $body['teacher_id']]);
        jsonResponse(['message' => 'Enrolled', 'id' => $db->lastInsertId()], 201);
    }
    if ($method === 'PUT') {
        $body = getBody();
        if (empty($body['teacher_id'])) jsonResponse(['error' => 'teacher_id required'], 422);
        $db->prepare('UPDATE enrollments SET teacher_id = ? WHERE id = ?')->execute([$body['teacher_id'], $id]);
        jsonResponse(['message' => 'Enrollment updated']);
    }
    if ($method === 'DELETE') {
        $db->prepare('DELETE FROM enrollments WHERE id=?')->execute([$id]);
        jsonResponse(['message' => 'Unenrolled']);
    }
}

// ── STATS ─────────────────────────────────────────────────
function handleStats(array $user): void {
    Auth::requireRole($user, 'admin');
    $db = Database::getConnection();
    jsonResponse([
        'students'    => $db->query('SELECT COUNT(*) FROM students')->fetchColumn(),
        'teachers'    => $db->query('SELECT COUNT(*) FROM teachers')->fetchColumn(),
        'courses'     => $db->query('SELECT COUNT(*) FROM courses')->fetchColumn(),
        'departments' => $db->query('SELECT COUNT(*) FROM departments')->fetchColumn(),
        'programs'    => $db->query('SELECT COUNT(*) FROM programs')->fetchColumn(),
        'enrollments' => $db->query('SELECT COUNT(*) FROM enrollments')->fetchColumn(),
        'active_users'=> $db->query("SELECT COUNT(*) FROM users WHERE is_active=1")->fetchColumn(),
    ]);
}