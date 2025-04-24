#!/bin/bash

# MongoDB Backup Script for Feeding Dashboard Application

# Configuration
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/home/ubuntu/mongodb_backups"
S3_BUCKET="your-s3-bucket-name" # Optional: Set this if you want to upload to S3
CONTAINER_NAME="mongodb"
DB_NAME="feeding-dashboard"
DB_USER="admin"
DB_PASSWORD="password"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Log start of backup
echo "Starting MongoDB backup at $(date)" >> $BACKUP_DIR/backup_log.txt

# Create backup filename
BACKUP_FILENAME="mongodb_backup_$TIMESTAMP.gz"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILENAME"

# Execute backup using mongodump
echo "Running mongodump..."
docker exec $CONTAINER_NAME sh -c "mongodump --username $DB_USER --password $DB_PASSWORD --authenticationDatabase admin --db $DB_NAME --archive" | gzip > $BACKUP_PATH

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "Backup completed successfully: $BACKUP_PATH" >> $BACKUP_DIR/backup_log.txt
    echo "Backup size: $(du -h $BACKUP_PATH | cut -f1)" >> $BACKUP_DIR/backup_log.txt
    
    # Optional: Upload to S3 if bucket name is set
    if [ ! -z "$S3_BUCKET" ] && [ "$S3_BUCKET" != "your-s3-bucket-name" ]; then
        echo "Uploading backup to S3..." >> $BACKUP_DIR/backup_log.txt
        aws s3 cp $BACKUP_PATH s3://$S3_BUCKET/mongodb_backups/$BACKUP_FILENAME
        
        if [ $? -eq 0 ]; then
            echo "Upload to S3 completed successfully" >> $BACKUP_DIR/backup_log.txt
        else
            echo "Failed to upload to S3" >> $BACKUP_DIR/backup_log.txt
        fi
    fi
    
    # Clean up old backups (keep last 7 days)
    find $BACKUP_DIR -name "mongodb_backup_*.gz" -type f -mtime +7 -delete
    echo "Removed backups older than 7 days" >> $BACKUP_DIR/backup_log.txt
else
    echo "Backup failed" >> $BACKUP_DIR/backup_log.txt
fi

echo "Backup process completed at $(date)" >> $BACKUP_DIR/backup_log.txt
echo "----------------------------------------" >> $BACKUP_DIR/backup_log.txt

# To set up as a daily cron job, run:
# crontab -e
# Add: 0 2 * * * /home/ubuntu/feeding-dashboard/backup-script.sh 