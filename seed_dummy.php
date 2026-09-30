<?php
/**
 * Read Smart SMS - Dummy Data Seeder
 * Pakistani names, CS department, NFC IET context
 * Run: php seed_dummy.php
 */

require_once __DIR__ . '/backend/config/env.php';

$pdo = new PDO(
    sprintf('mysql:host=%s;dbname=%s', env('DB_HOST', 'localhost'), env('DB_NAME', 'sms_db')),
    env('DB_USER', 'root'),
    env('DB_PASS', ''),
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "=== Read Smart SMS - Seeding Dummy Data ===\n\n";

// ── DEPARTMENTS ──────────────────────────────────────────
$pdo->exec("INSERT IGNORE INTO departments (id, name, code) VALUES
    (1, 'Computer Science', 'CS'),
    (2, 'Electrical Engineering', 'EE'),
    (3, 'Mechanical Engineering', 'ME'),
    (4, 'Civil Engineering', 'CE')");
echo "[OK] Departments seeded\n";

// ── PROGRAMS ─────────────────────────────────────────────
$pdo->exec("INSERT IGNORE INTO programs (id, department_id, name, code, duration_years) VALUES
    (1, 1, 'BS Computer Science', 'BSCS', 4),
    (2, 1, 'MS Computer Science', 'MSCS', 2),
    (3, 2, 'BS Electrical Engineering', 'BSEE', 4),
    (4, 3, 'BS Mechanical Engineering', 'BSME', 4)");
echo "[OK] Programs seeded\n";

// ── SEMESTERS ─────────────────────────────────────────────
$pdo->exec("INSERT IGNORE INTO semesters (id, name, start_date, end_date, is_current) VALUES
    (1, 'Fall 2022', '2022-09-01', '2023-01-31', 0),
    (2, 'Spring 2023', '2023-02-01', '2023-06-30', 0),
    (3, 'Fall 2023', '2023-09-01', '2024-01-31', 0),
    (4, 'Spring 2024', '2024-02-01', '2024-06-30', 0),
    (5, 'Fall 2024', '2024-09-01', '2025-01-31', 0),
    (6, 'Spring 2025', '2025-02-01', '2025-06-30', 1)");
echo "[OK] Semesters seeded\n";

// ── COURSES ───────────────────────────────────────────────
$pdo->exec("INSERT IGNORE INTO courses (id, program_id, name, code, credit_hours, description) VALUES
    (1,  1, 'Introduction to Programming',        'CS101', 3, 'Basics of programming using Python'),
    (2,  1, 'Object Oriented Programming',         'CS201', 3, 'OOP concepts using C++ and Java'),
    (3,  1, 'Data Structures and Algorithms',      'CS211', 3, 'Arrays, linked lists, trees, graphs'),
    (4,  1, 'Database Systems',                    'CS301', 3, 'Relational databases, SQL, normalization'),
    (5,  1, 'Operating Systems',                   'CS311', 3, 'Process management, memory, file systems'),
    (6,  1, 'Computer Networks',                   'CS321', 3, 'TCP/IP, routing, network protocols'),
    (7,  1, 'Web Engineering',                     'CS401', 3, 'HTML, CSS, JavaScript, PHP, React'),
    (8,  1, 'Software Engineering',                'CS411', 3, 'SDLC, Agile, UML, testing'),
    (9,  1, 'Artificial Intelligence',             'CS421', 3, 'Search algorithms, ML basics, neural networks'),
    (10, 1, 'Final Year Project I',                'CS491', 3, 'Project proposal and initial development'),
    (11, 1, 'Final Year Project II',               'CS492', 3, 'Project completion and presentation'),
    (12, 1, 'Discrete Mathematics',                'CS151', 3, 'Logic, sets, graph theory'),
    (13, 1, 'Calculus and Analytical Geometry',    'MATH101', 3, 'Limits, derivatives, integrals'),
    (14, 1, 'Linear Algebra',                      'MATH201', 3, 'Vectors, matrices, eigenvalues'),
    (15, 1, 'Digital Logic Design',                'CS161', 3, 'Boolean algebra, logic gates, circuits')");
echo "[OK] 15 CS courses seeded\n";

// ── TEACHERS ─────────────────────────────────────────────
$hash = password_hash('Teacher@1234', PASSWORD_BCRYPT, ['cost' => 10]);

$teachers = [
    ['Dr. Muhammad Sajid',     'sajid@sms.edu',     'EMP-001', 1, 'Associate Professor', 'PhD Computer Science'],
    ['Dr. Ayesha Siddiqui',    'ayesha@sms.edu',    'EMP-002', 1, 'Assistant Professor', 'PhD Software Engineering'],
    ['Mr. Bilal Ahmed',        'bilal@sms.edu',     'EMP-003', 1, 'Lecturer',            'MS Computer Science'],
    ['Dr. Usman Tariq',        'usman@sms.edu',     'EMP-004', 1, 'Associate Professor', 'PhD Artificial Intelligence'],
    ['Ms. Fatima Zahra',       'fatima@sms.edu',    'EMP-005', 1, 'Lecturer',            'MS Web Engineering'],
];

foreach ($teachers as [$name, $email, $empId, $deptId, $designation, $qualification]) {
    // Create user
    $stmt = $pdo->prepare("INSERT IGNORE INTO users (name, email, password, role_id, is_active) VALUES (?, ?, ?, 2, 1)");
    $stmt->execute([$name, $email, $hash]);
    $userId = $pdo->lastInsertId();

    if ($userId == 0) {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $userId = $stmt->fetchColumn();
    }

    // Create teacher profile
    $pdo->prepare("INSERT IGNORE INTO teachers (user_id, employee_id, department_id, designation, qualification, joining_date) VALUES (?, ?, ?, ?, ?, '2020-09-01')")
        ->execute([$userId, $empId, $deptId, $designation, $qualification]);
}
echo "[OK] 5 teachers seeded (password: Teacher@1234)\n";

// ── STUDENTS ─────────────────────────────────────────────
$shash = password_hash('Student@1234', PASSWORD_BCRYPT, ['cost' => 10]);

$students = [
    ['Muhammad Ahmed',        'ahmed@sms.edu',      '2K22-BSCS-001', 2022, 'male'],
    ['Ubaid ur Rehman',       'ubaid@sms.edu',      '2K22-BSCS-002', 2022, 'male'],
    ['Muhammad Maaz Khan',    'maaz@sms.edu',       '2K22-BSCS-003', 2022, 'male'],
    ['Murtaza Ahmad',         'murtaza@sms.edu',    '2K22-BSCS-004', 2022, 'male'],
    ['Sana Fatima',           'sana@sms.edu',       '2K22-BSCS-005', 2022, 'female'],
    ['Ali Hassan',            'ali@sms.edu',        '2K22-BSCS-006', 2022, 'male'],
    ['Zainab Malik',          'zainab@sms.edu',     '2K22-BSCS-007', 2022, 'female'],
    ['Hassan Raza',           'hassan@sms.edu',     '2K22-BSCS-008', 2022, 'male'],
    ['Amna Khalid',           'amna@sms.edu',       '2K22-BSCS-009', 2022, 'female'],
    ['Usman Ghani',           'usman_s@sms.edu',    '2K22-BSCS-010', 2022, 'male'],
    ['Ayesha Bibi',           'ayesha_s@sms.edu',   '2K22-BSCS-011', 2022, 'female'],
    ['Hamza Sheikh',          'hamza@sms.edu',       '2K22-BSCS-012', 2022, 'male'],
    ['Nadia Iqbal',           'nadia@sms.edu',       '2K22-BSCS-013', 2022, 'female'],
    ['Faisal Mahmood',        'faisal@sms.edu',      '2K22-BSCS-014', 2022, 'male'],
    ['Hira Baig',             'hira@sms.edu',        '2K22-BSCS-015', 2022, 'female'],
    ['Tariq Jameel',          'tariq@sms.edu',       '2K23-BSCS-001', 2023, 'male'],
    ['Rabia Noor',            'rabia@sms.edu',       '2K23-BSCS-002', 2023, 'female'],
    ['Imran Khan',            'imran@sms.edu',       '2K23-BSCS-003', 2023, 'male'],
    ['Sumbal Aslam',          'sumbal@sms.edu',      '2K23-BSCS-004', 2023, 'female'],
    ['Bilal Mustafa',         'bilal_s@sms.edu',     '2K23-BSCS-005', 2023, 'male'],
];

$studentIds = [];
foreach ($students as [$name, $email, $roll, $batch, $gender]) {
    $stmt = $pdo->prepare("INSERT IGNORE INTO users (name, email, password, role_id, is_active) VALUES (?, ?, ?, 3, 1)");
    $stmt->execute([$name, $email, $shash]);
    $userId = $pdo->lastInsertId();

    if ($userId == 0) {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $userId = $stmt->fetchColumn();
    }

    $pdo->prepare("INSERT IGNORE INTO students (user_id, roll_number, program_id, batch_year, gender, semester_id) VALUES (?, ?, 1, ?, ?, 6)")
        ->execute([$userId, $roll, $batch, $gender]);

    $stmt = $pdo->prepare("SELECT id FROM students WHERE user_id = ?");
    $stmt->execute([$userId]);
    $studentIds[$roll] = $stmt->fetchColumn();
}
echo "[OK] 20 students seeded (password: Student@1234)\n";

// ── ENROLLMENTS ───────────────────────────────────────────
// Get teacher IDs
$teacherStmt = $pdo->query("SELECT t.id, u.email FROM teachers t JOIN users u ON t.user_id = u.id");
$teacherMap = [];
foreach ($teacherStmt->fetchAll() as $t) {
    $teacherMap[$t['email']] = $t['id'];
}

$tid1 = $teacherMap['sajid@sms.edu']   ?? 1;
$tid2 = $teacherMap['ayesha@sms.edu']  ?? 1;
$tid3 = $teacherMap['bilal@sms.edu']   ?? 1;
$tid4 = $teacherMap['usman@sms.edu']   ?? 1;
$tid5 = $teacherMap['fatima@sms.edu']  ?? 1;

// Enroll 2022 batch students in 6 current courses
$courses2022 = [
    [7, $tid5],   // Web Engineering - Fatima
    [8, $tid2],   // Software Engineering - Ayesha
    [9, $tid4],   // AI - Usman
    [10, $tid1],  // FYP I - Sajid
    [11, $tid1],  // FYP II - Sajid
    [5, $tid3],   // OS - Bilal
];

$enrollCount = 0;
foreach ($studentIds as $roll => $sid) {
    if (!$sid) continue;
    $batch = substr($roll, 0, 4);
    if ($batch === '2K22') {
        foreach ($courses2022 as [$cid, $tid]) {
            $pdo->prepare("INSERT IGNORE INTO enrollments (student_id, course_id, semester_id, teacher_id) VALUES (?, ?, 6, ?)")
                ->execute([$sid, $cid, $tid]);
            $enrollCount++;
        }
    } else {
        // 2023 batch - semester 4 courses
        foreach ([[1,$tid3],[2,$tid3],[12,$tid1],[13,$tid1]] as [$cid, $tid]) {
            $pdo->prepare("INSERT IGNORE INTO enrollments (student_id, course_id, semester_id, teacher_id) VALUES (?, ?, 5, ?)")
                ->execute([$sid, $cid, $tid]);
            $enrollCount++;
        }
    }
}
echo "[OK] $enrollCount enrollments created\n";

// ── ATTENDANCE (last 30 days) ─────────────────────────────
$attendanceCount = 0;
$enrollStmt = $pdo->query("SELECT id FROM enrollments WHERE semester_id = 6 LIMIT 90");
$enrollIds = $enrollStmt->fetchAll(PDO::FETCH_COLUMN);

$statuses = ['present', 'present', 'present', 'present', 'absent', 'present', 'present', 'late'];

for ($d = 30; $d >= 1; $d--) {
    $date = date('Y-m-d', strtotime("-{$d} days"));
    $dow = date('N', strtotime($date));
    if ($dow >= 6) continue; // skip weekends

    foreach ($enrollIds as $eid) {
        $status = $statuses[array_rand($statuses)];
        try {
            $pdo->prepare("INSERT IGNORE INTO attendance (enrollment_id, date, status, marked_by) VALUES (?, ?, ?, 1)")
                ->execute([$eid, $date, $status]);
            $attendanceCount++;
        } catch (Exception $e) {}
    }
}
echo "[OK] $attendanceCount attendance records created\n";

// ── ASSIGNMENTS ───────────────────────────────────────────
$assignments = [
    [7,  $tid5, 6, 'Lab Assignment 1: Build a Login Form',         'Create a login form using HTML, CSS and JavaScript with validation', 20,  '-10 days'],
    [7,  $tid5, 6, 'Lab Assignment 2: PHP CRUD Application',       'Build a complete CRUD app using PHP and MySQL', 30, '-3 days'],
    [8,  $tid2, 6, 'Assignment 1: Use Case Diagrams',              'Draw use case diagrams for a hospital management system', 25, '-15 days'],
    [8,  $tid2, 6, 'Assignment 2: Software Testing Report',        'Write black box and white box test cases for your FYP', 30, '+5 days'],
    [9,  $tid4, 6, 'Assignment 1: Search Algorithms',              'Implement BFS and DFS and compare their performance', 25, '-20 days'],
    [9,  $tid4, 6, 'Assignment 2: Neural Network Basics',          'Train a simple neural network on MNIST dataset', 40, '+7 days'],
    [11, $tid1, 6, 'FYP Progress Report',                          'Submit complete progress report with screenshots', 50, '+3 days'],
    [5,  $tid3, 6, 'OS Assignment: Process Scheduling',            'Implement FCFS, SJF and Round Robin scheduling algorithms', 30, '-7 days'],
];

$assignIds = [];
foreach ($assignments as [$cid, $tid, $semId, $title, $desc, $marks, $dueOffset]) {
    $due = date('Y-m-d H:i:s', strtotime($dueOffset));
    $published = strtotime($dueOffset) < time() ? 1 : 1;
    $pdo->prepare("INSERT INTO assignments (course_id, teacher_id, semester_id, title, description, total_marks, due_date, is_published) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        ->execute([$cid, $tid, $semId, $title, $desc, $marks, $due, $published]);
    $assignIds[] = ['id' => $pdo->lastInsertId(), 'marks' => $marks];
}
echo "[OK] " . count($assignments) . " assignments created\n";

// ── ASSIGNMENT SUBMISSIONS ────────────────────────────────
$subCount = 0;
$texts = [
    "I have completed this assignment. The implementation works correctly as per the requirements. I tested all edge cases and the program handles them properly.",
    "The solution is attached. I used the concepts learned in class and applied them to solve the problem. All test cases pass successfully.",
    "I worked on this assignment for 3 days. The algorithm has O(n log n) complexity. I verified the output against multiple test cases.",
];

foreach ($assignIds as $idx => $assign) {
    if (strtotime($assign['id'] . ' days') > time()) continue;

    // Get enrolled students for this assignment's course
    $stmt = $pdo->query("SELECT DISTINCT e.student_id FROM enrollments e
        JOIN assignments a ON a.course_id = e.course_id AND a.semester_id = e.semester_id
        WHERE a.id = {$assign['id']} LIMIT 12");
    $sids = $stmt->fetchAll(PDO::FETCH_COLUMN);

    foreach ($sids as $sid) {
        $graded = rand(0, 1);
        $marks = $graded ? rand(round($assign['marks'] * 0.6), $assign['marks']) : null;
        $status = $graded ? 'graded' : 'submitted';
        try {
            $pdo->prepare("INSERT IGNORE INTO assignment_submissions (assignment_id, student_id, text_content, marks_obtained, status, graded_by, graded_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
                ->execute([$assign['id'], $sid, $texts[array_rand($texts)], $marks, $status, $graded ? 1 : null, $graded ? date('Y-m-d H:i:s') : null]);
            $subCount++;
        } catch (Exception $e) {}
    }
}
echo "[OK] $subCount assignment submissions created\n";

// ── GRADES ────────────────────────────────────────────────
function calcGrade(float $total): array {
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

$gradeCount = 0;
$enrollStmt = $pdo->query("SELECT id FROM enrollments WHERE semester_id IN (3,4,5)");
foreach ($enrollStmt->fetchAll(PDO::FETCH_COLUMN) as $eid) {
    $mid  = rand(18, 28);
    $fin  = rand(30, 48);
    $asgn = rand(6, 10);
    $quiz = rand(5, 10);
    $total = $mid + $fin + $asgn + $quiz;
    [$letter, $gpa] = calcGrade($total);
    try {
        $pdo->prepare("INSERT IGNORE INTO grades (enrollment_id, midterm_marks, final_marks, assignment_marks, quiz_marks, grade_letter, gpa) VALUES (?, ?, ?, ?, ?, ?, ?)")
            ->execute([$eid, $mid, $fin, $asgn, $quiz, $letter, $gpa]);
        $gradeCount++;
    } catch (Exception $e) {}
}
echo "[OK] $gradeCount grade records created\n";

// ── BOOKS ─────────────────────────────────────────────────
$pdo->exec("INSERT IGNORE INTO books (id, title, author, isbn, category, quantity, available_qty, description) VALUES
    (1, 'Introduction to Algorithms', 'Thomas H. Cormen', '978-0262033848', 'Algorithms', 5, 4, 'The classic algorithms textbook covering data structures, graph algorithms, and complexity'),
    (2, 'Clean Code', 'Robert C. Martin', '978-0132350884', 'Software Engineering', 3, 2, 'A handbook of agile software craftsmanship'),
    (3, 'Database System Concepts', 'Abraham Silberschatz', '978-0078022159', 'Database', 4, 3, 'Comprehensive coverage of database design and implementation'),
    (4, 'Computer Networks', 'Andrew Tanenbaum', '978-0132126953', 'Networks', 3, 3, 'A top-down approach to modern networking'),
    (5, 'Operating System Concepts', 'Abraham Silberschatz', '978-1118063330', 'Operating Systems', 4, 2, 'The dinosaur book - comprehensive OS coverage'),
    (6, 'Artificial Intelligence: A Modern Approach', 'Stuart Russell', '978-0134610993', 'AI/ML', 2, 2, 'The leading AI textbook used worldwide'),
    (7, 'JavaScript: The Good Parts', 'Douglas Crockford', '978-0596517748', 'Web Development', 3, 3, 'Essential JavaScript concepts and best practices'),
    (8, 'Python Crash Course', 'Eric Matthes', '978-1593279288', 'Programming', 5, 5, 'A hands-on introduction to programming with Python'),
    (9, 'The Pragmatic Programmer', 'David Thomas', '978-0135957059', 'Software Engineering', 2, 1, 'From journeyman to master - software development wisdom'),
    (10, 'Design Patterns', 'Gang of Four', '978-0201633610', 'Software Design', 3, 2, 'Elements of reusable object-oriented software')");
echo "[OK] 10 books added to library\n";

// ── NOTIFICATIONS ─────────────────────────────────────────
$pdo->exec("INSERT INTO notifications (sender_id, title, message, type, target_role) VALUES
    (1, 'Welcome to Read Smart SMS!', 'Welcome to NFC IET Read Smart Student Management System. Please complete your profile and check your enrolled courses.', 'general', 'all'),
    (1, 'FYP Viva Schedule', 'Final Year Project viva examinations are scheduled for this week. All FYP groups must be present with their laptops and complete project documentation.', 'general', 'student'),
    (1, 'Attendance Policy Reminder', 'Minimum 75% attendance is required as per HEC regulations. Students below 75% will not be allowed to sit in final exams.', 'attendance', 'student'),
    (1, 'Grade Submission Deadline', 'All teachers must submit final grades by end of this week. Please ensure all marks are entered in the system.', 'grade', 'teacher'),
    (1, 'New Books Added to Library', '10 new books have been added to the library including CLRS Algorithms, Clean Code, and Python Crash Course. Available for issuing now.', 'general', 'all')");
echo "[OK] 5 notifications created\n";

// ── SYSTEM CONFIG ─────────────────────────────────────────
$pdo->exec("INSERT INTO system_config (config_key, config_value) VALUES
    ('institution_name', 'NFC Institute of Engineering & Technology')
    ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)");

echo "\n=== Seeding Complete! ===\n";
echo "Teachers (password: Teacher@1234):\n";
echo "  sajid@sms.edu, ayesha@sms.edu, bilal@sms.edu, usman@sms.edu, fatima@sms.edu\n";
echo "Students (password: Student@1234):\n";
echo "  ahmed@sms.edu, ubaid@sms.edu, maaz@sms.edu, murtaza@sms.edu, sana@sms.edu\n";
echo "  ali@sms.edu, zainab@sms.edu, hassan@sms.edu, amna@sms.edu ... (+10 more)\n";
echo "Admin: admin@sms.edu / Admin@1234\n\n";
