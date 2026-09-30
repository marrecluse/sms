<?php
// backend/api/grades.php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/middleware/auth.php';

setCorsHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$user   = Auth::requireAuth();

match ($method) {
    'GET'  => getGrades($user),
    'POST' => saveGrade($user),
    'PUT'  => saveGrade($user),
    default => jsonResponse(['error' => 'Method not allowed'], 405),
};

function getGrades(array $auth): void {
    $db = Database::getConnection();
    $semId = $_GET['semester_id'] ?? null;

    if ($auth['role'] === 'student') {
        $params = [$auth['id']];
        $where  = 's.user_id = ?';
        if ($semId) { $where .= ' AND e.semester_id = ?'; $params[] = $semId; }
        $stmt = $db->prepare("
            SELECT c.name as course_name, c.code, c.credit_hours,
                   g.midterm_marks, g.final_marks, g.assignment_marks, g.quiz_marks,
                   g.total_marks, g.grade_letter, g.gpa,
                   sm.name as semester
            FROM grades g
            JOIN enrollments e ON g.enrollment_id = e.id
            JOIN students s ON e.student_id = s.id
            JOIN courses c ON e.course_id = c.id
            JOIN semesters sm ON e.semester_id = sm.id
            WHERE $where ORDER BY sm.name, c.name
        ");
        $stmt->execute($params);
        $grades = $stmt->fetchAll();

        // Calculate CGPA
        $totalCredits = 0; $weightedGpa = 0;
        foreach ($grades as $g) {
            $totalCredits  += $g['credit_hours'];
            $weightedGpa   += $g['gpa'] * $g['credit_hours'];
        }
        $cgpa = $totalCredits > 0 ? round($weightedGpa / $totalCredits, 2) : 0;
        jsonResponse(['grades' => $grades, 'cgpa' => $cgpa, 'total_credits' => $totalCredits]);
    }

    if ($auth['role'] === 'teacher') {
        $courseId = $_GET['course_id'] ?? null;
        if (!$courseId || !$semId) jsonResponse(['error' => 'course_id and semester_id required'], 422);
        $stmt = $db->prepare("
            SELECT s.roll_number, u.name as student_name,
                   g.midterm_marks, g.final_marks, g.assignment_marks, g.quiz_marks,
                   g.total_marks, g.grade_letter, g.gpa, e.id as enrollment_id
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            JOIN users u ON s.user_id = u.id
            LEFT JOIN grades g ON g.enrollment_id = e.id
            WHERE e.course_id = ? AND e.semester_id = ?
            ORDER BY u.name
        ");
        $stmt->execute([$courseId, $semId]);
        jsonResponse($stmt->fetchAll());
    }

    // Admin - full report
    $stmt = $db->query("
        SELECT u.name as student_name, s.roll_number, c.name as course_name,
               g.total_marks, g.grade_letter, g.gpa
        FROM grades g
        JOIN enrollments e ON g.enrollment_id = e.id
        JOIN students s ON e.student_id = s.id
        JOIN users u ON s.user_id = u.id
        JOIN courses c ON e.course_id = c.id
        ORDER BY u.name, c.name
    ");
    jsonResponse($stmt->fetchAll());
}

function saveGrade(array $auth): void {
    Auth::requireRole($auth, 'admin', 'teacher');
    $body = getBody();
    if (empty($body['enrollment_id'])) jsonResponse(['error' => 'enrollment_id required'], 422);

    $db = Database::getConnection();

    $midterm    = (float)($body['midterm_marks'] ?? 0);
    $final      = (float)($body['final_marks'] ?? 0);
    $assignment = (float)($body['assignment_marks'] ?? 0);
    $quiz       = (float)($body['quiz_marks'] ?? 0);
    $total      = $midterm + $final + $assignment + $quiz;

    [$letter, $gpa] = calculateGrade($total);

    $db->prepare("
        INSERT INTO grades (enrollment_id, midterm_marks, final_marks, assignment_marks, quiz_marks, grade_letter, gpa)
        VALUES (?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE
          midterm_marks=VALUES(midterm_marks), final_marks=VALUES(final_marks),
          assignment_marks=VALUES(assignment_marks), quiz_marks=VALUES(quiz_marks),
          grade_letter=VALUES(grade_letter), gpa=VALUES(gpa)
    ")->execute([$body['enrollment_id'], $midterm, $final, $assignment, $quiz, $letter, $gpa]);

    jsonResponse(['message' => 'Grade saved', 'letter' => $letter, 'gpa' => $gpa]);
}

function calculateGrade(float $total): array {
    return match(true) {
        $total >= 90 => ['A+', 4.0],
        $total >= 85 => ['A',  4.0],
        $total >= 80 => ['A-', 3.7],
        $total >= 75 => ['B+', 3.3],
        $total >= 70 => ['B',  3.0],
        $total >= 65 => ['B-', 2.7],
        $total >= 60 => ['C+', 2.3],
        $total >= 55 => ['C',  2.0],
        $total >= 50 => ['D',  1.0],
        default      => ['F',  0.0],
    };
}
