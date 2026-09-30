#!/bin/bash
# ============================================================
# Read Smart SMS — Quick Setup Script
# Run from the project root directory
# ============================================================

set -e

echo "======================================"
echo "  Read Smart SMS - Setup Script"
echo "  NFC Institute of Engineering & Tech"
echo "======================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
    echo "[ERROR] Node.js 18+ required (found $(node -v))"
    exit 1
fi
echo "[OK] Node.js $(node -v)"

# Check PHP
if ! command -v php &> /dev/null; then
    echo "[WARN] PHP not found in PATH. Make sure XAMPP Apache is configured correctly."
else
    echo "[OK] PHP $(php -v | head -1 | cut -d' ' -f2)"
fi

# Copy .env
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "[OK] Created .env from .env.example"
    echo "[ACTION] Please edit .env and set your DB_PASS and JWT_SECRET"
else
    echo "[OK] .env already exists"
fi

# Install frontend
echo ""
echo "Installing frontend dependencies..."
cd frontend
npm install
echo "[OK] Frontend dependencies installed"

# Build
echo ""
echo "Building frontend for production..."
npm run build
echo "[OK] Frontend built to frontend/dist/"

cd ..

echo ""
echo "======================================"
echo "  Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your database credentials"
echo "  2. Import database: mysql -u root -p sms_db < database/schema.sql"
echo "  3. Start XAMPP (Apache + MySQL)"
echo "  4. Open http://localhost/sms"
echo ""
echo "Default admin login:"
echo "  Email:    admin@sms.edu"
echo "  Password: Admin@1234"
echo ""
echo "  ⚠️  Change the default password immediately!"
echo ""
