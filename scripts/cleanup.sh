#!/bin/bash
# CloudArena Cleanup Script

echo "🧹 Stopping CloudArena services..."
docker compose down

echo "Remove volumes? (y/N)"
read -r confirm
if [[ "$confirm" == "y" || "$confirm" == "Y" ]]; then
    docker compose down -v
    echo "✅ Volumes removed"
fi

echo "✅ Cleanup complete"
