<?php
// backend/api/dashboard.php
require_once dirname(__DIR__) . '/config/database.php';
require_once dirname(__DIR__) . '/middleware/auth.php';

setCorsHeaders();
$user = Auth::requireAuth();
$db   = Database::getConnection();

match ($user['role']) {
    'admin'   => adminDashboard($db),
    'teacher' => teacherDashboard($db, $user),
    'student' => studentDashboard($db, $user),
    default   => jsonResponse(['error' => 'Unknown role'], 400),
};

function adminDashboard(PDO $db): void {
    $stats = [];
    $stats['total_students'] = (int)$db->query('SELECT COUNT(*) FROM students s JOIN users u ON s.user_id=u.id WHERE u.is_active=1')->fetchColumn();
    $stats['total_teachers'] = (int)$db->query('SELECT COUNT(*) FROM teachers t JOIN users u ON t.user_id=u.id WHERE u.is_active=1')->fetchColumn();
    $stats['total_courses']  = (int)$db->query('SELECT COUNT(*) FROM courses')->fetchColumn();
    $stats['total_users']    = (int)$db->query("SELECT COUNT(*) FROM users WHERE is_active=1")->fetchColumn();
    $stats['pending_grades'] = (int)$db->query("SELECT COUNT(*) FROM assignment_submissions WHERE status='submitted'")->fetchColumn();

    $stmt = $db->prepare("SELECT status, COUNT(*) as cnt FROM attendance WHERE date=CURDATE() GROUP BY status");
    $stmt->execute();
    $attendance = [];
    foreach ($stmt->fetchAll() as $r) $attendance[$r['status']] = (int)$r['cnt'];
    $stats['today_attendance'] = $attendance;

    $stmt = $db->query("SELECT DATE_FORMAT(enrolled_at,'%Y-%m') as month, COUNT(*) as count FROM enrollments GROUP BY month ORDER BY month DESC LIMIT 6");
    $stats['enrollment_trend'] = $stmt->fetchAll();

    $stmt = $db->query("SELECT u.name, s.roll_number, ROUND(AVG(g.gpa),2) as avg_gpa FROM grades g JOIN enrollments e ON g.enrollment_id=e.id JOIN students s ON e.student_id=s.id JOIN users u ON s.user_id=u.id GROUP BY s.id ORDER BY avg_gpa DESC LIMIT 5");
    $stats['top_students'] = $stmt->fetchAll();

    // Recent users
    $stmt = $db->query("SELECT u.name, r.name as role, u.created_at FROM users u JOIN roles r ON u.role_id=r.id ORDER BY u.created_at DESC LIMIT 5");
    $stats['recent_users'] = $stmt->fetchAll();

    jsonResponse($stats);
}

function teacherDashboard(PDO $db, array $user): void {
    $tStmt = $db->prepare('SELECT id FROM teachers WHERE user_id=?');
    $tStmt->execute([$user['id']]);
    $teacher = $tStmt->fetch();
    if (!$teacher) jsonResponse(['error' => 'Teacher profile not found'], 404);
    $tid = $teacher['id'];

    $stats = [];
    $stats['my_courses']     = (int)$db->query("SELECT COUNT(DISTINCT course_id) FROM enrollments WHERE teacher_id=$tid")->fetchColumn();
    $stats['my_students']    = (int)$db->query("SELECT COUNT(DISTINCT student_id) FROM enrollments WHERE teacher_id=$tid")->fetchColumn();
    $stats['pending_grades'] = (int)$db->query("SELECT COUNT(*) FROM assignment_submissions sub JOIN assignments a ON sub.assignment_id=a.id WHERE a.teacher_id=$tid AND sub.status='submitted'")->fetchColumn();

    $stmt = $db->prepare("SELECT a.title, a.due_date, c.name as course FROM assignments a JOIN courses c ON a.course_id=c.id WHERE a.teacher_id=? AND a.due_date>=NOW() ORDER BY a.due_date LIMIT 5");
    $stmt->execute([$tid]);
    $stats['upcoming_assignments'] = $stmt->fetchAll();

    $stmt = $db->prepare("SELECT c.name, COUNT(CASE WHEN a.status='present' THEN 1 END) as present, COUNT(a.id) as total FROM attendance a JOIN enrollments e ON a.enrollment_id=e.id JOIN courses c ON e.course_id=c.id WHERE e.teacher_id=? AND a.date=CURDATE() GROUP BY c.id");
    $stmt->execute([$tid]);
    $stats['today_attendance'] = $stmt->fetchAll();

    $stmt = $db->prepare("SELECT DISTINCT c.id, c.name, c.code FROM courses c JOIN enrollments e ON e.course_id=c.id WHERE e.teacher_id=?");
    $stmt->execute([$tid]);
    $stats['my_course_list'] = $stmt->fetchAll();

    jsonResponse($stats);
}

function studentDashboard(PDO $db, array $user): void {
    // Find student profile
    $sStmt = $db->prepare('SELECT s.id FROM students s WHERE s.user_id=?');
    $sStmt->execute([$user['id']]);
    $student = $sStmt->fetch();

    if (!$student) {
        // Return empty dashboard instead of error
        jsonResponse([
            'courses' => [], 'attendance_pct' => 0, 'cgpa' => 0,
            'upcoming_assignments' => [], 'unread_notifications' => 0,
            'warning' => 'Student profile not fully set up. Please contact admin.'
        ]);
        return;
    }
    $sid = $student['id'];

    $stmt = $db->prepare("SELECT c.name, c.code, c.credit_hours, u.name as teacher, sm.name as semester FROM enrollments e JOIN courses c ON e.course_id=c.id JOIN teachers t ON e.teacher_id=t.id JOIN users u ON t.user_id=u.id JOIN semesters sm ON e.semester_id=sm.id WHERE e.student_id=?");
    $stmt->execute([$sid]);
    $courses = $stmt->fetchAll();

    $stmt = $db->prepare("SELECT COUNT(*) as total, SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present FROM attendance a JOIN enrollments e ON a.enrollment_id=e.id WHERE e.student_id=?");
    $stmt->execute([$sid]);
    $att = $stmt->fetch();
    $attPct = $att['total'] > 0 ? round(($att['present']/$att['total'])*100,1) : 0;

    $stmt = $db->prepare("SELECT ROUND(AVG(g.gpa),2) as cgpa FROM grades g JOIN enrollments e ON g.enrollment_id=e.id WHERE e.student_id=?");
    $stmt->execute([$sid]);
    $cgpa = (float)($stmt->fetchColumn() ?? 0);

    $stmt = $db->prepare("SELECT a.title, a.due_date, c.name as course, CASE WHEN sub.id IS NULL THEN 'pending' ELSE sub.status END as status FROM assignments a JOIN enrollments e ON e.course_id=a.course_id AND e.semester_id=a.semester_id JOIN courses c ON a.course_id=c.id LEFT JOIN assignment_submissions sub ON sub.assignment_id=a.id AND sub.student_id=? WHERE e.student_id=? AND a.due_date>=NOW() AND a.is_published=1 ORDER BY a.due_date LIMIT 5");
    $stmt->execute([$sid, $sid]);
    $upcoming = $stmt->fetchAll();

    $stmt = $db->prepare("SELECT COUNT(*) FROM notifications n LEFT JOIN notification_reads nr ON nr.notification_id=n.id AND nr.user_id=? WHERE nr.id IS NULL AND (n.target_role='all' OR n.target_role='student')");
    $stmt->execute([$user['id']]);
    $unread = (int)$stmt->fetchColumn();

    jsonResponse([
        'courses'               => $courses,
        'attendance_pct'        => $attPct,
        'cgpa'                  => $cgpa,
        'upcoming_assignments'  => $upcoming,
        'unread_notifications'  => $unread,
    ]);
}
