#!/bin/bash

echo "🚀 Iniciando Kanban App..."

# Fazer backup antes de iniciar
echo "💾 Fazendo backup..."
./backup.sh

# Matar processos anteriores se existirem
lsof -ti:3001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# Iniciar backend
echo "⚙️  Iniciando backend..."
cd /Users/carlosmega/kanban-app/backend && npm run dev &

# Aguardar backend iniciar
sleep 2

# Iniciar frontend
echo "🎨 Iniciando frontend..."
cd /Users/carlosmega/kanban-app/frontend && npm run dev &

# Aguardar frontend iniciar
sleep 3

# Abrir navegador
echo "🌐 Abrindo navegador..."
open http://localhost:5173

echo ""
echo "✅ Kanban rodando em: http://localhost:5173"
echo "📁 Backup salvo em: ~/kanban-backups/"
echo ""
echo "Para parar: pressione Ctrl+C"

# Manter script rodando
wait
