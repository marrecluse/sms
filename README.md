# Read Smart SMS — Student Management System

> One-stop academic management platform for NFC Institute of Engineering & Technology

## Quick Start

```bash
# 1. Copy environment file
cp .env.example .env       # Then edit DB_PASS and JWT_SECRET

# 2. Import database (in phpMyAdmin or terminal)
mysql -u root -p < database/schema.sql

# 3. Install & run frontend
cd frontend && npm install && npm run dev

# 4. Open browser
#    http://localhost:3000
#    Login: admin@sms.edu / Admin@1234
```

## Features

| Portal | Features |
|--------|---------|
| **Admin** | User management, grade reports, library, notifications |
| **Teacher** | Attendance marking, assignment creation & grading, quizzes, grade entry |
| **Student** | Assignment submission, quiz taking, grade/CGPA view, attendance tracking |

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Recharts
- **Backend:** PHP 8.1+, PDO, Apache
- **Database:** MySQL 5.7+ (via XAMPP)
- **Auth:** JWT (HS256), bcrypt passwords

## Documentation

See `docs/DOCUMENTATION.md` for the full technical report including:
- System architecture diagrams
- Complete API reference
- Database ER design
- Installation guide
- Security overview

## Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@sms.edu | Admin@1234 |

**Change the admin password after first login.**

## Project Structure

```
sms/
├── .env.example        ← Environment template
├── .htaccess           ← Apache routing
├── setup.sh            ← Automated setup script
├── database/
│   └── schema.sql      ← MySQL schema (17 tables)
├── backend/
│   ├── config/         ← DB + env config
│   ├── middleware/      ← JWT auth + CORS
│   └── api/            ← REST endpoints
├── frontend/           ← React SPA
│   └── src/
│       ├── pages/      ← Admin / Teacher / Student portals
│       ├── components/ ← Shared UI components
│       ├── context/    ← Auth state
│       └── services/   ← API client
└── docs/
    └── DOCUMENTATION.md ← Full technical report
```
