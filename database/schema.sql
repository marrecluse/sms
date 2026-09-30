-- ============================================================
-- Read Smart SMS - Student Management System
-- Database Schema
-- MySQL 5.7+ / MariaDB 10.3+
-- ============================================================

CREATE DATABASE IF NOT EXISTS sms_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sms_db;

-- ============================================================
-- USERS & ROLES
-- ============================================================

CREATE TABLE roles (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name ENUM('admin','teacher','student') NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (name) VALUES ('admin'), ('teacher'), ('student');

CREATE TABLE users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role_id INT UNSIGNED NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  profile_picture VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- Default admin (password: Admin@1234)
-- IMPORTANT: After importing this schema, run: php fix_password.php
-- This sets the correct bcrypt hash for Admin@1234
INSERT INTO users (name, email, password, role_id)
VALUES ('System Admin', 'admin@sms.edu',
  '$2y$10$TKh8H1.PfQ0A5rl5G4UMYuWn3GkbKj7U7JuI.4V.vRlWnEsmR4B8S', 1);

-- ============================================================
-- ACADEMIC STRUCTURE
-- ============================================================

CREATE TABLE departments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE programs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  department_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  duration_years TINYINT DEFAULT 4,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

CREATE TABLE semesters (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  program_id INT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  code VARCHAR(20) NOT NULL UNIQUE,
  credit_hours TINYINT DEFAULT 3,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (program_id) REFERENCES programs(id)
);

-- ============================================================
-- STUDENTS
-- ============================================================

CREATE TABLE students (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  roll_number VARCHAR(30) NOT NULL UNIQUE,
  program_id INT UNSIGNED NOT NULL,
  semester_id INT UNSIGNED,
  batch_year YEAR NOT NULL,
  dob DATE,
  gender ENUM('male','female','other'),
  guardian_name VARCHAR(100),
  guardian_phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (program_id) REFERENCES programs(id),
  FOREIGN KEY (semester_id) REFERENCES semesters(id)
);

-- ============================================================
-- TEACHERS
-- ============================================================

CREATE TABLE teachers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL UNIQUE,
  employee_id VARCHAR(30) NOT NULL UNIQUE,
  department_id INT UNSIGNED NOT NULL,
  designation VARCHAR(100),
  qualification VARCHAR(150),
  joining_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- ============================================================
-- COURSE ENROLLMENT
-- ============================================================

CREATE TABLE enrollments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id INT UNSIGNED NOT NULL,
  course_id INT UNSIGNED NOT NULL,
  semester_id INT UNSIGNED NOT NULL,
  teacher_id INT UNSIGNED NOT NULL,
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_enrollment (student_id, course_id, semester_id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (semester_id) REFERENCES semesters(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id)
);

-- ============================================================
-- ATTENDANCE
-- ============================================================

CREATE TABLE attendance (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  enrollment_id INT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  status ENUM('present','absent','late','excused') NOT NULL,
  remarks VARCHAR(255),
  marked_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendance (enrollment_id, date),
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
  FOREIGN KEY (marked_by) REFERENCES users(id)
);

-- ============================================================
-- ASSIGNMENTS
-- ============================================================

CREATE TABLE assignments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  teacher_id INT UNSIGNED NOT NULL,
  semester_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  file_path VARCHAR(255),
  total_marks DECIMAL(5,2) DEFAULT 100,
  due_date DATETIME NOT NULL,
  is_published TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  FOREIGN KEY (semester_id) REFERENCES semesters(id)
);

CREATE TABLE assignment_submissions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  assignment_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  file_path VARCHAR(255),
  text_content TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  marks_obtained DECIMAL(5,2) DEFAULT NULL,
  feedback TEXT,
  graded_at TIMESTAMP NULL,
  graded_by INT UNSIGNED,
  status ENUM('submitted','graded','late') DEFAULT 'submitted',
  UNIQUE KEY uq_submission (assignment_id, student_id),
  FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (graded_by) REFERENCES users(id)
);

-- ============================================================
-- QUIZZES
-- ============================================================

CREATE TABLE quizzes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  teacher_id INT UNSIGNED NOT NULL,
  semester_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  total_marks DECIMAL(5,2) DEFAULT 20,
  duration_minutes INT DEFAULT 30,
  start_time DATETIME,
  end_time DATETIME,
  is_published TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id),
  FOREIGN KEY (teacher_id) REFERENCES teachers(id),
  FOREIGN KEY (semester_id) REFERENCES semesters(id)
);

CREATE TABLE quiz_questions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT UNSIGNED NOT NULL,
  question_text TEXT NOT NULL,
  question_type ENUM('mcq','short','true_false') DEFAULT 'mcq',
  marks DECIMAL(4,2) DEFAULT 1,
  option_a VARCHAR(255),
  option_b VARCHAR(255),
  option_c VARCHAR(255),
  option_d VARCHAR(255),
  correct_answer VARCHAR(255),
  sort_order INT DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE quiz_attempts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  submitted_at TIMESTAMP NULL,
  marks_obtained DECIMAL(5,2) DEFAULT NULL,
  status ENUM('in_progress','submitted','graded') DEFAULT 'in_progress',
  UNIQUE KEY uq_attempt (quiz_id, student_id),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

CREATE TABLE quiz_answers (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  attempt_id INT UNSIGNED NOT NULL,
  question_id INT UNSIGNED NOT NULL,
  answer_given VARCHAR(255),
  is_correct TINYINT(1) DEFAULT NULL,
  FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE
);

-- ============================================================
-- GRADES
-- ============================================================

CREATE TABLE grades (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  enrollment_id INT UNSIGNED NOT NULL UNIQUE,
  midterm_marks DECIMAL(5,2) DEFAULT 0,
  final_marks DECIMAL(5,2) DEFAULT 0,
  assignment_marks DECIMAL(5,2) DEFAULT 0,
  quiz_marks DECIMAL(5,2) DEFAULT 0,
  total_marks DECIMAL(5,2) GENERATED ALWAYS AS (midterm_marks + final_marks + assignment_marks + quiz_marks) STORED,
  grade_letter VARCHAR(5),
  gpa DECIMAL(3,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sender_id INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('general','assignment','quiz','grade','attendance','system') DEFAULT 'general',
  target_role ENUM('all','admin','teacher','student') DEFAULT 'all',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE TABLE notification_reads (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  notification_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_notif_read (notification_id, user_id),
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- LIBRARY (Books / E-Books)
-- ============================================================

CREATE TABLE books (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  author VARCHAR(150),
  isbn VARCHAR(20) UNIQUE,
  category VARCHAR(100),
  quantity INT DEFAULT 1,
  available_qty INT DEFAULT 1,
  cover_image VARCHAR(255),
  ebook_path VARCHAR(255),
  qr_code VARCHAR(255),
  barcode VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE book_issues (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  book_id INT UNSIGNED NOT NULL,
  student_id INT UNSIGNED NOT NULL,
  issued_by INT UNSIGNED NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  return_date DATE DEFAULT NULL,
  status ENUM('issued','returned','overdue') DEFAULT 'issued',
  fine_amount DECIMAL(8,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id),
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (issued_by) REFERENCES users(id)
);

-- ============================================================
-- SYSTEM CONFIG
-- ============================================================

CREATE TABLE system_config (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO system_config (config_key, config_value) VALUES
  ('institution_name', 'NFC Institute of Engineering & Technology'),
  ('institution_address', 'Pakistan'),
  ('current_semester', '1'),
  ('academic_year', '2024-2025'),
  ('grading_scale', '{"A":90,"B":80,"C":70,"D":60,"F":0}');

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_users_role ON users(role_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_enrollment ON attendance(enrollment_id);
CREATE INDEX idx_assignments_due ON assignments(due_date);
CREATE INDEX idx_submissions_student ON assignment_submissions(student_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
