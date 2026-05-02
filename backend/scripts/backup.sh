#!/bin/bash
# Backup script for database
# Usage: ./backup.sh

set -e

BACKUP_DIR="../backups"
DATE=$(date +"%Y%m%d_%H%M%S")
FILENAME="db_backup_$DATE.sqlite3.gz"

mkdir -p "$BACKUP_DIR"

# For SQLite: copy and gzip
# Note: For PostgreSQL, replace this with: pg_dump -U $DB_USER $DB_NAME | gzip > "$BACKUP_DIR/$FILENAME"
echo "Creating backup..."
sqlite3 ../db.sqlite3 ".backup 'main' '../$BACKUP_DIR/temp.sqlite3'"
gzip -c "../$BACKUP_DIR/temp.sqlite3" > "$BACKUP_DIR/$FILENAME"
rm "../$BACKUP_DIR/temp.sqlite3"

echo "Backup completed successfully at $BACKUP_DIR/$FILENAME."
