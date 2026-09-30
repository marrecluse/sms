<?php
// backend/api/quizzes.php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/middleware/auth.php';

setCorsHeaders();
$method = $_SERVER['REQUEST_METHOD'];
$user   = Auth::requireAuth();
$id     = $_GET['id'] ?? null;
$action = $_GET['action'] ?? null;

if ($action === 'attempt')  { handleAttempt($user);  return; }
if ($action === 'submit')   { handleSubmit($user);   return; }
if ($action === 'results')  { handleResults($user);  return; }

match ($method) {
    'GET'    => $id ? getQuiz($id, $user) : listQuizzes($user),
    'POST'   => createQuiz($user),
    'PUT'    => updateQuiz($id, $user),
    'DELETE' => deleteQuiz($id, $user),
    default  => jsonResponse(['error' => 'Method not allowed'], 405),
};

function listQuizzes(array $auth): void {
    $db = Database::getConnection();
    if ($auth['role'] === 'student') {
        $stmt = $db->prepare("
            SELECT q.id, q.title, q.description, q.total_marks, q.duration_minutes,
                   q.start_time, q.end_time, q.is_published,
                   c.name as course_name, c.code as course_code,
                   u.name as teacher_name,
                   qa.id as attempt_id, qa.status as attempt_status, qa.marks_obtained
            FROM quizzes q
            JOIN courses c ON q.course_id = c.id
            JOIN teachers t ON q.teacher_id = t.id
            JOIN users u ON t.user_id = u.id
            JOIN enrollments e ON e.course_id = q.course_id AND e.semester_id = q.semester_id
            JOIN students s ON e.student_id = s.id
            LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id AND qa.student_id = s.id
            WHERE s.user_id = ? AND q.is_published = 1
            ORDER BY q.start_time DESC
        ");
        $stmt->execute([$auth['id']]);
    } elseif ($auth['role'] === 'teacher') {
        $stmt = $db->prepare("
            SELECT q.id, q.title, q.total_marks, q.duration_minutes,
                   q.start_time, q.end_time, q.is_published,
                   c.name as course_name,
                   COUNT(DISTINCT qa.id) as attempts_count
            FROM quizzes q
            JOIN courses c ON q.course_id = c.id
            JOIN teachers t ON q.teacher_id = t.id
            LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
            WHERE t.user_id = ?
            GROUP BY q.id ORDER BY q.created_at DESC
        ");
        $stmt->execute([$auth['id']]);
    } else {
        $stmt = $db->query("
            SELECT q.id, q.title, q.total_marks, q.is_published,
                   c.name as course_name, u.name as teacher_name,
                   COUNT(DISTINCT qa.id) as attempts_count
            FROM quizzes q
            JOIN courses c ON q.course_id = c.id
            JOIN teachers t ON q.teacher_id = t.id
            JOIN users u ON t.user_id = u.id
            LEFT JOIN quiz_attempts qa ON qa.quiz_id = q.id
            GROUP BY q.id ORDER BY q.created_at DESC
        ");
    }
    jsonResponse($stmt->fetchAll());
}

function getQuiz(string $id, array $auth): void {
    $db   = Database::getConnection();
    $stmt = $db->prepare("SELECT q.*, c.name as course_name FROM quizzes q JOIN courses c ON q.course_id = c.id WHERE q.id = ?");
    $stmt->execute([$id]);
    $quiz = $stmt->fetch();
    if (!$quiz) jsonResponse(['error' => 'Quiz not found'], 404);

    // Load questions (hide correct answers for students)
    $qStmt = $db->prepare("SELECT id, question_text, question_type, marks, option_a, option_b, option_c, option_d" . ($auth['role'] !== 'student' ? ", correct_answer" : "") . " FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order");
    $qStmt->execute([$id]);
    $quiz['questions'] = $qStmt->fetchAll();

    jsonResponse($quiz);
}

function createQuiz(array $auth): void {
    Auth::requireRole($auth, 'admin', 'teacher');
    $body = getBody();
    foreach (['title','course_id','semester_id','total_marks'] as $f) {
        if (empty($body[$f])) jsonResponse(['error' => "$f is required"], 422);
    }
    $db = Database::getConnection();

    if ($auth['role'] === 'teacher') {
        $tStmt = $db->prepare('SELECT id FROM teachers WHERE user_id = ?');
        $tStmt->execute([$auth['id']]);
        $teacher = $tStmt->fetch();
        if (!$teacher) jsonResponse(['error' => 'Teacher profile not found'], 404);
        $teacherId = $teacher['id'];
    } else {
        // Admin must explicitly provide teacher_id
        if (empty($body['teacher_id'])) jsonResponse(['error' => 'teacher_id is required when admin creates a quiz'], 422);
        $teacherId = (int) $body['teacher_id'];
        // Verify teacher exists
        $tStmt = $db->prepare('SELECT id FROM teachers WHERE id = ?');
        $tStmt->execute([$teacherId]);
        if (!$tStmt->fetch()) jsonResponse(['error' => 'Specified teacher not found'], 404);
    }

    $db->prepare('INSERT INTO quizzes (course_id, teacher_id, semester_id, title, description, total_marks, duration_minutes, start_time, end_time, is_published) VALUES (?,?,?,?,?,?,?,?,?,?)')
       ->execute([
           $body['course_id'], $teacherId, $body['semester_id'],
           $body['title'], $body['description'] ?? null,
           $body['total_marks'], $body['duration_minutes'] ?? 30,
           $body['start_time'] ?? null, $body['end_time'] ?? null,
           $body['is_published'] ?? 0,
       ]);
    $quizId = $db->lastInsertId();

    // Insert questions if provided
    if (!empty($body['questions']) && is_array($body['questions'])) {
        foreach ($body['questions'] as $i => $q) {
            $db->prepare('INSERT INTO quiz_questions (quiz_id, question_text, question_type, marks, option_a, option_b, option_c, option_d, correct_answer, sort_order) VALUES (?,?,?,?,?,?,?,?,?,?)')
               ->execute([$quizId, $q['question_text'], $q['question_type'] ?? 'mcq', $q['marks'] ?? 1, $q['option_a'] ?? null, $q['option_b'] ?? null, $q['option_c'] ?? null, $q['option_d'] ?? null, $q['correct_answer'] ?? null, $i]);
        }
    }
    jsonResponse(['message' => 'Quiz created', 'id' => $quizId], 201);
}

function updateQuiz(string $id, array $auth): void {
    Auth::requireRole($auth, 'admin', 'teacher');
    $body = getBody();
    $db   = Database::getConnection();
    $db->prepare('UPDATE quizzes SET title=?, description=?, total_marks=?, duration_minutes=?, start_time=?, end_time=?, is_published=? WHERE id=?')
       ->execute([$body['title'], $body['description'] ?? null, $body['total_marks'], $body['duration_minutes'] ?? 30, $body['start_time'] ?? null, $body['end_time'] ?? null, $body['is_published'] ?? 0, $id]);
    jsonResponse(['message' => 'Quiz updated']);
}

function deleteQuiz(string $id, array $auth): void {
    Auth::requireRole($auth, 'admin', 'teacher');
    $db = Database::getConnection();
    $db->prepare('DELETE FROM quizzes WHERE id = ?')->execute([$id]);
    jsonResponse(['message' => 'Quiz deleted']);
}

function handleAttempt(array $auth): void {
    Auth::requireRole($auth, 'student');
    $quizId = $_GET['quiz_id'] ?? null;
    if (!$quizId) jsonResponse(['error' => 'quiz_id required'], 422);

    $db    = Database::getConnection();
    $sStmt = $db->prepare('SELECT id FROM students WHERE user_id = ?');
    $sStmt->execute([$auth['id']]);
    $student = $sStmt->fetch();
    if (!$student) jsonResponse(['error' => 'Student not found'], 404);

    // Check if already attempted
    $aStmt = $db->prepare('SELECT * FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?');
    $aStmt->execute([$quizId, $student['id']]);
    $existing = $aStmt->fetch();
    if ($existing && $existing['status'] !== 'in_progress') {
        jsonResponse(['error' => 'Quiz already submitted'], 409);
    }

    if (!$existing) {
        $db->prepare('INSERT INTO quiz_attempts (quiz_id, student_id) VALUES (?,?)')->execute([$quizId, $student['id']]);
        $attemptId = $db->lastInsertId();
    } else {
        $attemptId = $existing['id'];
    }

    // Return quiz with questions (no correct answers)
    $qStmt = $db->prepare('SELECT id, question_text, question_type, marks, option_a, option_b, option_c, option_d FROM quiz_questions WHERE quiz_id = ? ORDER BY sort_order');
    $qStmt->execute([$quizId]);

    jsonResponse(['attempt_id' => $attemptId, 'questions' => $qStmt->fetchAll()]);
}

function handleSubmit(array $auth): void {
    Auth::requireRole($auth, 'student');
    $body      = getBody();
    $attemptId = $body['attempt_id'] ?? null;
    $answers   = $body['answers'] ?? [];
    if (!$attemptId) jsonResponse(['error' => 'attempt_id required'], 422);

    $db = Database::getConnection();
    $db->beginTransaction();
    try {
        $score = 0;
        foreach ($answers as $ans) {
            $qStmt = $db->prepare('SELECT correct_answer, marks FROM quiz_questions WHERE id = ?');
            $qStmt->execute([$ans['question_id']]);
            $q = $qStmt->fetch();
            $correct = $q && strtolower(trim($q['correct_answer'])) === strtolower(trim($ans['answer'] ?? ''));
            if ($correct) $score += (float) $q['marks'];

            $db->prepare('INSERT INTO quiz_answers (attempt_id, question_id, answer_given, is_correct) VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE answer_given=VALUES(answer_given), is_correct=VALUES(is_correct)')
               ->execute([$attemptId, $ans['question_id'], $ans['answer'] ?? null, $correct ? 1 : 0]);
        }
        $db->prepare('UPDATE quiz_attempts SET marks_obtained=?, submitted_at=NOW(), status="submitted" WHERE id=?')->execute([$score, $attemptId]);
        $db->commit();
        jsonResponse(['message' => 'Quiz submitted', 'marks_obtained' => $score]);
    } catch (Exception $e) {
        $db->rollBack();
        jsonResponse(['error' => $e->getMessage()], 500);
    }
}

function handleResults(array $auth): void {
    $quizId = $_GET['quiz_id'] ?? null;
    if (!$quizId) jsonResponse(['error' => 'quiz_id required'], 422);
    $db   = Database::getConnection();
    $stmt = $db->prepare("
        SELECT qa.marks_obtained, qa.submitted_at, qa.status,
               s.roll_number, u.name as student_name
        FROM quiz_attempts qa
        JOIN students s ON qa.student_id = s.id
        JOIN users u ON s.user_id = u.id
        WHERE qa.quiz_id = ?
        ORDER BY qa.marks_obtained DESC
    ");
    $stmt->execute([$quizId]);
    jsonResponse($stmt->fetchAll());
}
