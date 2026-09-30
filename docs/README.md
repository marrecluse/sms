# Read Smart — Student Management System
## Full Project Documentation Report

**Institution:** NFC Institute of Engineering & Technology  
**Project Title:** Read Smart — One Stop SMS  
**Team Members:**
- Muhammad Ahmed — 2K22-BSCS-435
- Ubaid-ur-Rehman — 2K22-BSCS-405
- Muhammad Maaz Akram Khan — 2K22-BSCS-433
- Murtaza Ahmad — 2K22-BSCS-448

**Document Version:** 1.0  
**Date:** 2024

---

## Table of Contents

1. [Introduction](#introduction)
2. [Problem Statement](#problem-statement)
3. [Objectives](#objectives)
4. [System Architecture](#system-architecture)
5. [Technology Stack](#technology-stack)
6. [Database Design](#database-design)
7. [Modules & Features](#modules--features)
8. [API Reference](#api-reference)
9. [Installation & Setup](#installation--setup)
10. [Environment Configuration](#environment-configuration)
11. [User Roles & Permissions](#user-roles--permissions)
12. [Security Measures](#security-measures)
13. [Grading System](#grading-system)
14. [Methodology](#methodology)
15. [Limitations & Scalability](#limitations--scalability)
16. [Conclusion](#conclusion)

---

## 1. Introduction

The Read Smart Student Management System (SMS) is a comprehensive, web-based academic management platform developed for NFC Institute of Engineering & Technology. It digitizes and centralizes the entire academic workflow—covering student enrollment, attendance tracking, assignment management, quiz administration, grading, library management, and real-time notifications.

Traditional manual systems for tracking assignments, grades, and attendance are time-consuming, prone to errors, and lack real-time visibility. This system replaces those workflows with an automated, role-aware platform accessible to three types of users: Administrators, Teachers, and Students.

---

## 2. Problem Statement

Traditional student record systems rely heavily on manual management and paperwork, resulting in:

- Lack of real-time data access for faculty and students
- Inconsistent grading practices across departments
- Communication gaps between administrators, teachers, and students
- Errors in attendance records due to manual entry
- Difficulty generating consolidated academic reports
- No centralized repository for assignments and learning materials

A centralized, automated Student Management System is needed to address these shortcomings and improve institutional performance.

---

## 3. Objectives

- Develop a robust, web-based Student Management System using modern technologies
- Automate grading, attendance tracking, and assignment submission workflows
- Ensure real-time communication among administrators, teachers, and students
- Implement secure JWT-based authentication with role-based access control
- Provide detailed reports on student performance and attendance
- Support an integrated library module with QR/Barcode-based book issuance
- Include an AI Chatbot for student assistance (extensibility hook)

---

## 4. System Architecture

The system follows a **Client-Server architecture** with three distinct layers:

```
┌─────────────────────────────────────────────────┐
│               CLIENT (Browser)                  │
│     React 18 + Tailwind CSS + Recharts          │
│  Admin Portal | Teacher Portal | Student Portal │
└────────────────────┬────────────────────────────┘
                     │ HTTPS / JSON
┌────────────────────▼────────────────────────────┐
│              SERVER (PHP 8.1+)                  │
│   RESTful API · JWT Auth · CORS Middleware      │
│   /api/auth | users | attendance | assignments  │
│   grades | quizzes | notifications | dashboard  │
│   courses | books                               │
└────────────────────┬────────────────────────────┘
                     │ PDO
┌────────────────────▼────────────────────────────┐
│              DATABASE (MySQL 5.7+)              │
│   17 tables · Normalized schema · Indexes       │
│   Users, Roles, Courses, Grades, Attendance     │
│   Assignments, Quizzes, Books, Notifications    │
└─────────────────────────────────────────────────┘
```

### Request Flow
1. User interacts with React SPA
2. Axios sends JWT-authenticated HTTP request to PHP API
3. PHP middleware validates token and checks role permissions
4. Controller queries MySQL via PDO prepared statements
5. JSON response returned and rendered in React

---

## 5. Technology Stack

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.2 | UI component library |
| React Router DOM | 6.x | Client-side routing |
| Axios | 1.x | HTTP client with interceptors |
| Tailwind CSS | 3.4 | Utility-first styling |
| Recharts | 2.12 | Data visualization charts |
| React Hot Toast | 2.4 | Toast notifications |
| date-fns | 3.x | Date formatting/manipulation |
| Vite | 5.x | Build tool and dev server |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| PHP | 8.1+ | Server-side scripting |
| PDO | Native | Database abstraction layer |
| Apache .htaccess | — | URL routing and CORS |

### Database
| Technology | Version | Purpose |
|------------|---------|---------|
| MySQL | 5.7+ | Relational data storage |

### Development Tools
| Tool | Purpose |
|------|---------|
| XAMPP | Local Apache + MySQL environment |
| VS Code | Code editor |
| Git | Version control |
| Postman | API testing |

---

## 6. Database Design

The database consists of **17 tables** organized across four domains:

### Core Tables

**users** — All system users (admin/teacher/student)
```
id, name, email, password (bcrypt), role_id, is_active, 
profile_picture, phone, address, created_at, updated_at
```

**roles** — admin, teacher, student

**students** — Extended student profile
```
id, user_id (FK), roll_number, program_id (FK), semester_id (FK),
batch_year, dob, gender, guardian_name, guardian_phone
```

**teachers** — Extended teacher profile
```
id, user_id (FK), employee_id, department_id (FK),
designation, qualification, joining_date
```

### Academic Tables

**departments** → **programs** → **courses** (hierarchical)

**semesters** — Academic terms with start/end dates

**enrollments** — Student ↔ Course ↔ Teacher ↔ Semester mapping

### Assessment Tables

**attendance** — Per-enrollment, per-date records (present/absent/late/excused)

**assignments** — Course assignments with due dates

**assignment_submissions** — Student submissions with grading

**quizzes** + **quiz_questions** + **quiz_attempts** + **quiz_answers** — Full quiz engine

**grades** — Final grade record per enrollment (computed letter + GPA)

### Library Tables

**books** — Catalog with availability tracking

**book_issues** — Issue/return records with fine calculation

### System Tables

**notifications** + **notification_reads** — Broadcast messaging

**system_config** — Key-value configuration store

### Entity Relationship Summary
```
users ─┬─ students ─── enrollments ─── courses
       │                    │
       ├─ teachers ─────────┘
       │
       └─ notifications

enrollments ─── attendance
enrollments ─── grades

assignments ─── assignment_submissions
quizzes ─────── quiz_questions
quizzes ─────── quiz_attempts ─── quiz_answers

books ─── book_issues
```

---

## 7. Modules & Features

### 7.1 Admin Portal

**Dashboard**
- Real-time statistics: total students, teachers, courses, pending grades
- Today's attendance pie chart (present/absent/late/excused)
- Enrollment trend bar chart (last 6 months)
- Top 5 students by GPA

**User Management**
- Create, view, activate/deactivate users for all roles
- Filter by role (admin/teacher/student)
- Automatic profile creation (students table or teachers table) on user creation
- Bcrypt password hashing (configurable rounds via .env)

**Reports & Analytics**
- Grade distribution bar chart (A+ through F)
- Pass rate and distinction statistics
- Institution-wide academic performance

**Library Management**
- Add/edit/remove books from catalog
- Issue books to students with due date
- Return books with automatic fine calculation (Rs 10/day overdue)
- View all currently issued books

**Notifications**
- Broadcast messages to all users, or target specific roles
- Message types: general, assignment, quiz, grade, attendance, system

### 7.2 Teacher Portal

**Dashboard**
- My courses count, my students count, pending grading count
- Upcoming assignments list
- Today's attendance summary per course (with progress bars)

**Attendance Management**
- Load student attendance records by course ID and date
- Bulk mark present/absent/late/excused with one click
- Individual status override
- Save all attendance in a single API call

**Assignment Management**
- Create assignments with title, description, due date, max marks
- Publish immediately or save as draft
- View all student submissions per assignment
- Grade submissions with marks and written feedback

**Quiz Management**
- Create quizzes with MCQ, True/False, or Short Answer questions
- Set duration, start time, end time
- Auto-grading for MCQ and True/False questions
- View ranked results leaderboard per quiz

**Grade Entry**
- Enter marks by enrollment: Midterm (30), Final (50), Assignment (10), Quiz (10)
- Automatic letter grade and GPA calculation on save
- Per-student save with immediate feedback

**Notifications**
- Send targeted notifications to all users or specific roles

### 7.3 Student Portal

**Dashboard**
- Enrolled courses with teacher names
- Attendance percentage with color-coded status (green ≥75%, red <75%)
- Current CGPA
- Upcoming assignments with status (pending/submitted/graded)
- Unread notification count
- Low attendance warning banner

**Assignments**
- View all published assignments filtered by status (pending/submitted)
- Submit assignment text directly in-browser
- View grades and teacher feedback after grading

**Quizzes**
- View available, upcoming, and completed quizzes
- Full quiz-taking interface with countdown timer
- MCQ button grid, True/False toggle, Short Answer textarea
- Auto-submit when timer expires
- View scores after submission

**Grades**
- Detailed grade breakdown: Midterm, Final, Assignment, Quiz marks
- Grade letter and GPA per course
- CGPA calculation with total credit hours

**Attendance**
- Date-range filter for records
- Animated attendance percentage bar
- Per-class status (present/absent/late/excused) with teacher info
- Warning if below 75% threshold

**Library**
- Browse book catalog with search
- View availability status

**Notifications**
- Receive and read notifications from admin/teachers
- Mark individual or all as read

---

## 8. API Reference

All endpoints require `Authorization: Bearer <token>` header except `/api/auth?action=login`.

### Authentication
```
POST /api/auth?action=login       — Login, returns JWT token
GET  /api/auth?action=me          — Get current user profile
POST /api/auth?action=logout      — Logout (client-side token deletion)
POST /api/auth?action=refresh     — Refresh JWT token
```

### Users (Admin only)
```
GET    /api/users                 — List all users (filter: ?role=student)
GET    /api/users?id={id}         — Get single user
POST   /api/users                 — Create user
PUT    /api/users?id={id}         — Update user
DELETE /api/users?id={id}         — Deactivate user
```

### Dashboard
```
GET /api/dashboard                — Role-specific dashboard stats
```

### Attendance
```
GET  /api/attendance              — Get attendance (params: course_id, start_date, end_date)
POST /api/attendance              — Mark attendance (bulk records array)
PUT  /api/attendance?id={id}      — Update single attendance record
```

### Assignments
```
GET    /api/assignments           — List assignments (role-filtered)
GET    /api/assignments?id={id}   — Get assignment + submissions
POST   /api/assignments           — Create assignment (teacher/admin)
PUT    /api/assignments?id={id}   — Update assignment
DELETE /api/assignments?id={id}   — Delete assignment
POST   /api/assignments?action=submit                        — Student submit
POST   /api/assignments?action=grade&submission_id={id}      — Teacher grade
```

### Grades
```
GET  /api/grades                  — Get grades (role-filtered; params: course_id, semester_id)
POST /api/grades                  — Save/update grade for enrollment
```

### Quizzes
```
GET    /api/quizzes               — List quizzes (role-filtered)
GET    /api/quizzes?id={id}       — Get quiz with questions
POST   /api/quizzes               — Create quiz with questions
PUT    /api/quizzes?id={id}       — Update quiz
DELETE /api/quizzes?id={id}       — Delete quiz
POST   /api/quizzes?action=attempt&quiz_id={id}  — Start attempt
POST   /api/quizzes?action=submit                — Submit answers
GET    /api/quizzes?action=results&quiz_id={id}  — Ranked results
```

### Books / Library
```
GET    /api/books                 — List books (filter: ?search=keyword)
GET    /api/books?id={id}         — Get book + issue history
POST   /api/books                 — Add book (admin)
PUT    /api/books?id={id}         — Update book (admin)
DELETE /api/books?id={id}         — Delete book (admin)
POST   /api/books?action=issue    — Issue book to student
POST   /api/books?action=return&issue_id={id}  — Return book
GET    /api/books?action=issued   — All currently issued books
```

### Notifications
```
GET  /api/notifications           — List notifications + unread count
POST /api/notifications           — Send notification (admin/teacher)
POST /api/notifications?action=read&id={id}  — Mark as read (omit id = mark all)
```

### Courses
```
GET    /api/courses               — List courses (role-filtered)
GET    /api/courses?id={id}       — Get single course
POST   /api/courses               — Create course (admin)
PUT    /api/courses?id={id}       — Update course (admin)
DELETE /api/courses?id={id}       — Delete course (admin)
```

---

## 9. Installation & Setup

### Prerequisites
- XAMPP (Apache 2.4+, PHP 8.1+, MySQL 5.7+)
- Node.js 18+ and npm
- Git

### Step 1 — Clone and Place Files
```bash
git clone <repo-url> sms
# Place the sms/ folder in C:/xampp/htdocs/ (Windows) or /opt/lampp/htdocs/ (Linux)
```

### Step 2 — Configure Environment
```bash
cp .env.example .env
```
Edit `.env` with your database credentials and secrets:
```
DB_HOST=localhost
DB_PORT=3306
DB_NAME=sms_db
DB_USER=root
DB_PASS=yourpassword
JWT_SECRET=your_long_random_secret_here
```

### Step 3 — Create Database
Open phpMyAdmin or MySQL CLI:
```sql
CREATE DATABASE sms_db CHARACTER SET utf8mb4;
```
Then import the schema:
```bash
mysql -u root -p sms_db < database/schema.sql
```

### Step 4 — Install Frontend Dependencies
```bash
cd frontend
npm install
```

### Step 5 — Configure Frontend Environment
```bash
# frontend/.env (already provided)
VITE_API_URL=/api
VITE_BACKEND_URL=http://localhost:8000
```

### Step 6 — Start the Application

**Development mode** (two terminals):
```bash
# Terminal 1: Start XAMPP (Apache + MySQL)
# Access via http://localhost/sms

# Terminal 2: Start React dev server
cd frontend
npm run dev
# Access via http://localhost:3000 (proxied to XAMPP)
```

**Production build:**
```bash
cd frontend
npm run build
# Copies optimized files to frontend/dist/
# Apache serves dist/ via .htaccess SPA fallback
```

### Step 7 — First Login
Navigate to `http://localhost:3000` and log in:
- **Email:** `admin@sms.edu`
- **Password:** `Admin@1234`

> ⚠️ Change the default admin password immediately after first login.

---

## 10. Environment Configuration

All sensitive configuration is stored in the `.env` file at the project root. Never commit this file to version control.

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | MySQL hostname | localhost |
| `DB_PORT` | MySQL port | 3306 |
| `DB_NAME` | Database name | sms_db |
| `DB_USER` | Database username | root |
| `DB_PASS` | Database password | _(empty)_ |
| `JWT_SECRET` | Secret key for JWT signing | **MUST change** |
| `JWT_EXPIRY` | Token lifetime in seconds | 86400 (24h) |
| `CORS_ORIGIN` | Allowed frontend origin | http://localhost:3000 |
| `BCRYPT_ROUNDS` | Password hashing cost | 12 |
| `UPLOAD_MAX_SIZE` | Max file upload in bytes | 10485760 (10MB) |
| `MAIL_HOST` | SMTP server hostname | smtp.gmail.com |
| `MAIL_USERNAME` | SMTP email address | — |
| `MAIL_PASSWORD` | SMTP app password | — |
| `ADMIN_DEFAULT_EMAIL` | Default admin email | admin@sms.edu |
| `ADMIN_DEFAULT_PASSWORD` | Default admin password | Admin@1234 |

---

## 11. User Roles & Permissions

| Feature | Admin | Teacher | Student |
|---------|-------|---------|---------|
| View dashboard | ✅ | ✅ | ✅ |
| Manage users | ✅ | ❌ | ❌ |
| View all grades | ✅ | ❌ | ❌ |
| Enter grades | ✅ | ✅ | ❌ |
| View own grades | — | — | ✅ |
| Mark attendance | ✅ | ✅ | ❌ |
| View own attendance | — | — | ✅ |
| Create assignments | ✅ | ✅ | ❌ |
| Submit assignments | ❌ | ❌ | ✅ |
| Grade submissions | ✅ | ✅ | ❌ |
| Create quizzes | ✅ | ✅ | ❌ |
| Take quizzes | ❌ | ❌ | ✅ |
| View quiz results | ✅ | ✅ | Own only |
| Manage books | ✅ | ❌ | ❌ |
| Issue/return books | ✅ | ❌ | ❌ |
| Browse library | ✅ | ✅ | ✅ |
| Send notifications | ✅ | ✅ | ❌ |
| Receive notifications | ✅ | ✅ | ✅ |
| View reports | ✅ | ❌ | ❌ |

---

## 12. Security Measures

### Authentication & Authorization
- **JWT (JSON Web Tokens):** Stateless, signed with HMAC-SHA256 using `JWT_SECRET`
- **Token expiry:** Configurable via `JWT_EXPIRY` (default 24 hours)
- **Role-based access control:** Every API endpoint verifies the user's role
- **Bcrypt password hashing:** Cost factor configurable (default 12 rounds)

### Database Security
- **PDO Prepared Statements:** All database queries use parameterized inputs — SQL injection is prevented at the framework level
- **Least privilege:** Database user should only have permissions for `sms_db`

### Input Validation
- All required fields validated server-side before database operations
- Email uniqueness enforced at both database and application level
- Numeric bounds enforced on marks (e.g. midterm max 30, final max 50)

### Network Security (Production)
- **SSL/TLS:** Configure Apache to serve over HTTPS
- **CORS:** Only the configured `CORS_ORIGIN` is allowed
- **Firewalls:** Restrict MySQL port (3306) to localhost only

### Frontend Security
- JWT stored in `localStorage` (consider `httpOnly` cookies for higher security production deployments)
- Automatic token expiry handling — 401 responses redirect to login
- Role-based route guards in React prevent unauthorized page access

---

## 13. Grading System

The system uses a 100-point scale with the following distribution:

| Component | Max Marks | Weight |
|-----------|-----------|--------|
| Midterm Exam | 30 | 30% |
| Final Exam | 50 | 50% |
| Assignments | 10 | 10% |
| Quizzes | 10 | 10% |
| **Total** | **100** | **100%** |

### Grade Scale

| Total Marks | Letter Grade | GPA Points |
|-------------|--------------|------------|
| 90 – 100 | A+ | 4.0 |
| 85 – 89 | A | 4.0 |
| 80 – 84 | A- | 3.7 |
| 75 – 79 | B+ | 3.3 |
| 70 – 74 | B | 3.0 |
| 65 – 69 | B- | 2.7 |
| 60 – 64 | C+ | 2.3 |
| 55 – 59 | C | 2.0 |
| 50 – 54 | D | 1.0 |
| Below 50 | F | 0.0 |

### CGPA Calculation
```
CGPA = Σ (Course GPA × Credit Hours) / Σ Credit Hours
```

### Attendance Policy
- Minimum attendance requirement: **75%**
- Students below 75% receive a warning banner on their dashboard
- Attendance statuses: Present, Absent, Late, Excused

---

## 14. Methodology

The project follows an **Agile/Iterative** development approach with the following phases:

### Phase 1 — Requirement Gathering
- Stakeholder interviews with faculty and students
- Analysis of existing manual workflows
- Feature prioritization (MoSCoW method)

### Phase 2 — System Design & Prototyping
- Database schema design (17-table normalized schema)
- API endpoint specification
- UI wireframes for all three portals
- Environment and security architecture

### Phase 3 — Frontend & Backend Development
- Database schema and seed data
- PHP RESTful API with JWT middleware
- React SPA with role-based routing
- Component library (StatsCard, Sidebar, modals)

### Phase 4 — Integration & Testing
- API integration testing via Postman
- End-to-end workflow testing (login → submit → grade)
- Cross-browser and mobile responsiveness testing
- Security testing (SQL injection, token validation)

### Phase 5 — Deployment & Maintenance
- XAMPP configuration and .htaccess routing
- Production build with Vite
- Documentation and user training materials

---

## 15. Limitations & Scalability

### Current Limitations
- **Limited offline access:** The system requires a stable internet connection; no service worker caching for offline use
- **File uploads:** File attachment for assignments/submissions requires additional storage configuration
- **Real-time updates:** Notifications and attendance are not pushed in real-time (requires page refresh); WebSocket integration would add this
- **Single institution:** Multi-campus support not implemented in current version

### Scalability Roadmap
- **Cloud hosting:** Migrate from XAMPP to AWS/GCP/Azure with managed MySQL (RDS)
- **AI-powered features:** Integrate AI chatbot for student Q&A, predictive analytics for at-risk students
- **Multi-campus support:** Add campus/branch hierarchy to departments
- **Mobile apps:** React Native wrappers for iOS/Android
- **WebSocket notifications:** Real-time push for new assignments and grades
- **Reporting exports:** PDF/Excel export for grade sheets and attendance reports
- **LMS integration:** Connect with external learning management systems via API

---

## 16. Conclusion

The Read Smart Student Management System successfully addresses the core challenges of traditional academic management by delivering a fully digital, role-aware platform for NFC Institute of Engineering & Technology.

The system automates key processes including attendance tracking, assignment submission and grading, quiz administration, and grade calculation — reducing administrative overhead while improving data accuracy and accessibility. The three-portal design (Admin, Teacher, Student) ensures each user type has precisely the tools they need without unnecessary complexity.

Built on a modern, industry-standard technology stack (React, PHP, MySQL), the system is maintainable, extensible, and ready for production deployment with minimal configuration. The comprehensive `.env`-based configuration system ensures sensitive credentials are never hardcoded, while the JWT authentication layer provides stateless, scalable security.

Future enhancements including AI-powered insights, real-time notifications, and cloud deployment will further strengthen the platform's capabilities as the institution grows.

---

*Document prepared by the Read Smart SMS Development Team*  
*NFC Institute of Engineering & Technology*  
*© 2024 All Rights Reserved*
