#!/bin/bash
# CloudArena Local Setup Script

set -e

echo "🚀 CloudArena Setup"
echo "==================="

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is required. Install from https://docs.docker.com/get-docker/"
    exit 1
fi

# Copy env file
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env from template"
    echo "⚠️  Edit backend/.env and set a strong SECRET_KEY before running in production!"
fi

# Start services
echo "🐳 Starting Docker Compose services..."
docker compose up -d

# Wait for DB
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Run migrations
echo "📊 Running database migrations..."
docker compose exec -T backend sh -c "cd /app && alembic upgrade head"

echo ""
echo "✅ CloudArena is running!"
echo "   Frontend:  http://localhost:80"
echo "   API:       http://localhost:8000"
echo "   API Docs:  http://localhost:8000/api/docs"
