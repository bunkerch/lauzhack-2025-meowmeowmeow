#!/bin/bash

echo "🚂 CFF Ticket ZK - Setup Script"
echo "================================"
echo ""

# Check Node.js version
echo "📋 Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js >= 18.0.0"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be >= 18.0.0 (current: $(node -v))"
    exit 1
fi
echo "✅ Node.js $(node -v)"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Installing pnpm..."
    npm install -g pnpm
fi
echo "✅ pnpm $(pnpm -v)"

# Check Docker (optional)
if command -v docker &> /dev/null; then
    echo "✅ Docker $(docker -v | cut -d' ' -f3 | cut -d',' -f1)"
    DOCKER_AVAILABLE=true
else
    echo "⚠️  Docker not found (optional - you can use local PostgreSQL)"
    DOCKER_AVAILABLE=false
fi

echo ""
echo "🔧 Installing dependencies..."
pnpm install

echo ""
if [ "$DOCKER_AVAILABLE" = true ]; then
    echo "🐘 Starting PostgreSQL with Docker..."
    docker-compose up -d
    echo "✅ PostgreSQL started on port 5432"
else
    echo "⚠️  Please ensure PostgreSQL is running and create database 'cff_tickets'"
    echo "   Run: createdb cff_tickets"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 To start the development servers:"
echo "   pnpm dev"
echo ""
echo "📚 Frontend: http://localhost:5173"
echo "🔌 Backend:  http://localhost:3000"
echo ""
echo "For more information, see SETUP.md"

