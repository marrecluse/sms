<?php
/**
 * Read Smart SMS - Password Fix Script
 * Run this ONCE after importing the database schema
 * Usage: php fix_password.php
 */

// Load .env
$env = parse_ini_file('.env');
$host = $env['DB_HOST'] ?? 'localhost';
$port = $env['DB_PORT'] ?? '3306';
$name = $env['DB_NAME'] ?? 'sms_db';
$user = $env['DB_USER'] ?? 'root';
$pass = $env['DB_PASS'] ?? '';

echo "=== Read Smart SMS - Initial Setup ===\n\n";

try {
    $pdo = new PDO("mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
    echo "[OK] Connected to database '$name'\n";
} catch (Exception $e) {
    echo "[ERROR] Cannot connect to database: " . $e->getMessage() . "\n";
    echo "  Make sure MySQL is running and DB_PASS is set in .env\n";
    exit(1);
}

// Fix admin password
$hash = password_hash('Admin@1234', PASSWORD_BCRYPT, ['cost' => 10]);
$pdo->prepare("UPDATE users SET password=?, is_active=1 WHERE email='admin@sms.edu'")->execute([$hash]);
echo "[OK] Admin password set to: Admin@1234\n";

// Seed default academic data if empty
$deptCount = $pdo->query("SELECT COUNT(*) FROM departments")->fetchColumn();
if ($deptCount == 0) {
    $pdo->exec("INSERT INTO departments (id,name,code) VALUES
        (1,'Computer Science','CS'),
        (2,'Electrical Engineering','EE'),
        (3,'Mechanical Engineering','ME')");
    $pdo->exec("INSERT INTO programs (id,department_id,name,code,duration_years) VALUES
        (1,1,'BS Computer Science','BSCS',4),
        (2,1,'MS Computer Science','MSCS',2),
        (3,2,'BS Electrical Engineering','BSEE',4)");
    $pdo->exec("INSERT INTO semesters (id,name,start_date,end_date,is_current) VALUES
        (1,'Fall 2024','2024-09-01','2025-01-31',0),
        (2,'Spring 2025','2025-02-01','2025-06-30',0),
        (3,'Fall 2025','2025-09-01','2026-01-31',1)");
    $pdo->exec("INSERT INTO courses (id,program_id,name,code,credit_hours) VALUES
        (1,1,'Introduction to Programming','CS101',3),
        (2,1,'Data Structures and Algorithms','CS201',3),
        (3,1,'Database Systems','CS301',3),
        (4,1,'Web Engineering','CS401',3),
        (5,1,'Operating Systems','CS351',3),
        (6,1,'Software Engineering','CS451',3)");
    echo "[OK] Seeded: 3 departments, 3 programs, 3 semesters, 6 courses\n";
} else {
    echo "[OK] Academic data already exists (departments: $deptCount)\n";
}

echo "\n=== Setup Complete! ===\n";
echo "Login: admin@sms.edu / Admin@1234\n";
echo "Remember to change the password after first login!\n\n";
