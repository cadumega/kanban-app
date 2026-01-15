#!/bin/bash

# Pasta de backups
BACKUP_DIR="$HOME/kanban-backups"
mkdir -p "$BACKUP_DIR"

# Nome do arquivo com data/hora
BACKUP_FILE="$BACKUP_DIR/kanban-$(date +%Y%m%d-%H%M%S).db"

# Copiar banco de dados
cp /Users/carlosmega/kanban-app/backend/kanban.db "$BACKUP_FILE"

echo "✅ Backup salvo em: $BACKUP_FILE"

# Manter só os últimos 10 backups (apaga os mais antigos)
cd "$BACKUP_DIR" && ls -t *.db | tail -n +11 | xargs rm -f 2>/dev/null

echo "📁 Backups existentes:"
ls -lh "$BACKUP_DIR"/*.db 2>/dev/null | tail -5
