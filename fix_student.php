<?php
require_once __DIR__ . '/backend/config/env.php';

$pdo = new PDO(
    sprintf('mysql:host=%s;dbname=%s', env('DB_HOST', 'localhost'), env('DB_NAME', 'sms_db')),
    env('DB_USER', 'root'),
    env('DB_PASS', '')
);

// Get Ahmad's user ID
$stmt = $pdo->query("SELECT id FROM users WHERE email='ahmad@sms.local'");
$user = $stmt->fetch();
if (!$user) {
    // Try the other email
    $stmt = $pdo->query("SELECT id FROM users WHERE role_id=3 LIMIT 1");
    $user = $stmt->fetch();
}
if (!$user) { echo "No student user found\n"; exit; }

echo "Student user ID: " . $user['id'] . "\n";

// Check if student profile exists
$stmt = $pdo->prepare('SELECT id FROM students WHERE user_id=?');
$stmt->execute([$user['id']]);
$existing = $stmt->fetch();

if ($existing) {
    echo "Student profile already exists, ID=" . $existing['id'] . "\n";
} else {
    $pdo->prepare('INSERT INTO students (user_id, roll_number, program_id, batch_year) VALUES (?,?,1,2022)')
        ->execute([$user['id'], '2K22-BSCS-001']);
    echo "Student profile created! ID=" . $pdo->lastInsertId() . "\n";
}

// Re-enroll in courses with correct student_id
$sid = $pdo->query('SELECT id FROM students LIMIT 1')->fetchColumn();
$tid = $pdo->query('SELECT id FROM teachers LIMIT 1')->fetchColumn();
$smid = $pdo->query('SELECT id FROM semesters WHERE is_current=1 LIMIT 1')->fetchColumn();

echo "student_id=$sid teacher_id=$tid semester_id=$smid\n";

if ($sid && $tid && $smid) {
    foreach ([1,2,3] as $cid) {
        $pdo->prepare('INSERT IGNORE INTO enrollments (student_id,course_id,semester_id,teacher_id) VALUES (?,?,?,?)')
            ->execute([$sid, $cid, $smid, $tid]);
    }
    echo "Student enrolled in 3 courses!\n";
}

// Final count
$count = $pdo->query('SELECT COUNT(*) FROM students s JOIN users u ON s.user_id=u.id WHERE u.is_active=1')->fetchColumn();
echo "Active students in DB: $count\n";
echo "\nDone! Refresh the admin dashboard.\n";
