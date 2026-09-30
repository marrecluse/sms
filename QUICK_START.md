# 🚀 Read Smart SMS — Quick Start Guide

## Prerequisites
- macOS/Windows/Linux
- PHP 8.1+ (`brew install php` on Mac)
- MySQL 8.0+ (`brew install mysql` on Mac, then `brew services start mysql`)
- Node.js 18+ (https://nodejs.org)

---

## Setup (5 Steps)

### Step 1 — Configure Environment
```bash
cp .env.example .env
# Edit .env: set DB_PASS to your MySQL root password
# Set JWT_SECRET to any long random string
```

### Step 2 — Create Database
```bash
mysql -u root -p < database/schema.sql
```

### Step 3 — Fix Admin Password & Seed Data
```bash
php fix_password.php
```
This sets the admin password correctly and seeds departments/programs/semesters/courses.

### Step 4 — Start Backend (Terminal 1)
```bash
php -S localhost:8000 backend/router.php
```

### Step 5 — Start Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000**

---

## Default Login
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sms.edu | Admin@1234 |

---

## First Steps After Login

1. **Admin → Academic Setup** → Add Department → Add Program → Add Semester (mark current) → Add Courses
2. **Admin → Users** → Add Teacher (fill Employee ID) → Add Student (fill Roll Number)  
3. **Admin → Enrollments** → Enroll student → pick course, semester, teacher
4. Now teacher and student portals will have real data!

---

## Every Time You Want to Run It

**Terminal 1:**
```bash
cd /path/to/sms
php -S localhost:8000 backend/router.php
```

**Terminal 2:**
```bash
cd /path/to/sms/frontend
npm run dev
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login fails | Run `php fix_password.php` again |
| "Student profile not found" | Enroll student via Admin → Enrollments |
| MySQL connection error | Check `DB_PASS` in `.env`, ensure MySQL is running |
| Port 8000 in use | `lsof -i :8000 | grep LISTEN` then kill the PID |
| npm install fails | Make sure Node.js 18+ is installed |
