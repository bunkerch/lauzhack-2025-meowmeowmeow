#!/bin/bash

echo "🚂 Starting CFF Ticket ZK Platform..."
echo "======================================"
echo ""

# Check if PostgreSQL is running
if command -v docker &> /dev/null; then
    if [ "$(docker ps -q -f name=cff_postgres)" ]; then
        echo "✅ PostgreSQL container is running"
    else
        echo "🐘 Starting PostgreSQL..."
        docker-compose up -d
        echo "⏳ Waiting for PostgreSQL to be ready..."
        sleep 3
    fi
else
    echo "⚠️  Assuming PostgreSQL is running locally..."
fi

echo ""
echo "🚀 Starting development servers..."
echo ""
echo "📚 Frontend: http://localhost:5173"
echo "🔌 Backend:  http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

cd "$(dirname "$0")/.."
pnpm dev

