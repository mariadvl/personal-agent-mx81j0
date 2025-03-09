#!/usr/bin/env python3
"""
Backup Manager for Personal AI Agent

This script implements a comprehensive backup management system for the Personal AI Agent,
providing automated and manual backup capabilities for all user data. It handles scheduling,
execution, rotation, and verification of backups while supporting both local storage and
optional encrypted cloud backup.
"""

import os
import sys
import logging
import argparse
import datetime
import json
import asyncio
import threading
import pathlib
from pathlib import Path
import tempfile
import shutil
import base64
import time
import schedule
import uuid

from ..config.settings import Settings
from ..services.storage_manager import StorageManager
from ..utils.event_bus import EventBus
from ..utils.encryption import encrypt_file, decrypt_file

# Configure logger
logger = logging.getLogger(__name__)

# Initialize globals
settings = Settings()
event_bus = EventBus()
DEFAULT_BACKUP_DIR = "backups"

def setup_logging():
    """
    Configures logging for the backup manager.
    """
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "logs")
    os.makedirs(log_dir, exist_ok=True)
    
    # Set up file handler
    file_handler = logging.FileHandler(os.path.join(log_dir, "backup_manager.log"))
    file_handler.setFormatter(logging.Formatter(log_format))
    
    # Set up console handler
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter(log_format))
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)
    
    # Set specific level for this module's logger
    logger.setLevel(logging.DEBUG)

def parse_arguments():
    """
    Parses command-line arguments for the backup manager.
    
    Returns:
        argparse.Namespace: Parsed command-line arguments
    """
    parser = argparse.ArgumentParser(
        description="Backup Manager for Personal AI Agent",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )
    
    parser.add_argument(
        "operation",
        choices=["create", "restore", "list", "delete", "schedule", "verify"],
        help="Backup operation to perform"
    )
    
    parser.add_argument(
        "--name", "-n",
        help="Name or path for the backup (required for restore, delete, and verify operations)"
    )
    
    parser.add_argument(
        "--include-files", "-f",
        action="store_true",
        help="Include files in the backup (for create operation)"
    )
    
    parser.add_argument(
        "--encrypt", "-e",
        action="store_true",
        help="Encrypt the backup (for create operation)"
    )
    
    parser.add_argument(
        "--cloud", "-c",
        action="store_true",
        help="Upload to or download from cloud storage"
    )
    
    parser.add_argument(
        "--password", "-p",
        help="Password for encryption/decryption"
    )
    
    parser.add_argument(
        "--frequency",
        choices=["daily", "weekly", "monthly"],
        default="daily",
        help="Frequency for scheduled backups"
    )
    
    parser.add_argument(
        "--retention", "-r",
        type=int,
        default=5,
        help="Number of backups to retain (for scheduled backups)"
    )
    
    return parser.parse_args()

def validate_backup_directory(backup_dir):
    """
    Ensures the backup directory exists and is writable.
    
    Args:
        backup_dir (str): Path to the backup directory
        
    Returns:
        bool: True if directory is valid and accessible
    """
    try:
        # Create directory if it doesn't exist
        os.makedirs(backup_dir, exist_ok=True)
        
        # Check if directory is writable
        test_file = os.path.join(backup_dir, ".write_test")
        with open(test_file, 'w') as f:
            f.write("test")
        os.remove(test_file)
        
        return True
    except (IOError, PermissionError) as e:
        logger.error(f"Backup directory {backup_dir} is not accessible: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Error validating backup directory: {str(e)}")
        return False

def get_backup_path(backup_dir, backup_name=None):
    """
    Generates a path for a new backup with timestamp.
    
    Args:
        backup_dir (str): Base backup directory
        backup_name (str): Optional name for the backup
        
    Returns:
        str: Full path to the backup location
    """
    if not backup_name:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"backup_{timestamp}"
    
    # Ensure backup name is filesystem-safe
    backup_name = backup_name.replace(" ", "_").replace("/", "_").replace("\\", "_")
    
    return os.path.join(backup_dir, backup_name)

async def create_backup(backup_name=None, include_files=True, encrypt=True, upload_to_cloud=False):
    """
    Creates a new backup using the StorageManager.
    
    Args:
        backup_name (str): Optional name for the backup
        include_files (bool): Whether to include files in the backup
        encrypt (bool): Whether to encrypt the backup
        upload_to_cloud (bool): Whether to upload the backup to cloud storage
        
    Returns:
        dict: Backup metadata including status and path
    """
    try:
        # Initialize StorageManager
        storage_manager = StorageManager()
        await storage_manager.initialize()
        
        # Get backup directory from settings
        backup_dir = settings.get('storage.backup_dir', DEFAULT_BACKUP_DIR)
        
        # Validate backup directory
        if not validate_backup_directory(backup_dir):
            return {"success": False, "error": f"Invalid backup directory: {backup_dir}"}
        
        # Generate backup path
        backup_path = get_backup_path(backup_dir, backup_name)
        
        logger.info(f"Creating backup at {backup_path}")
        
        # Create backup
        backup_metadata = await storage_manager.create_backup(
            backup_name=os.path.basename(backup_path),
            include_files=include_files,
            encrypt=encrypt,
            upload_to_cloud=upload_to_cloud
        )
        
        if backup_metadata.get("success", False):
            logger.info(f"Backup created successfully: {backup_path}")
            
            # Publish event
            event_bus.publish("backup:created", {
                "path": backup_metadata.get("path", backup_path),
                "encrypted": encrypt,
                "cloud": upload_to_cloud,
                "timestamp": datetime.datetime.now().isoformat()
            })
            
            return backup_metadata
        else:
            logger.error(f"Failed to create backup: {backup_metadata.get('error', 'Unknown error')}")
            return backup_metadata
        
    except Exception as e:
        logger.error(f"Error creating backup: {str(e)}")
        return {"success": False, "error": str(e)}

async def restore_backup(backup_path, decrypt=True, download_from_cloud=False):
    """
    Restores data from an existing backup.
    
    Args:
        backup_path (str): Path to the backup
        decrypt (bool): Whether to decrypt the backup
        download_from_cloud (bool): Whether to download the backup from cloud storage
        
    Returns:
        bool: True if restore was successful
    """
    try:
        # Initialize StorageManager
        storage_manager = StorageManager()
        await storage_manager.initialize()
        
        # Validate backup path
        if not os.path.exists(backup_path) and not download_from_cloud:
            logger.error(f"Backup path does not exist: {backup_path}")
            return False
        
        logger.info(f"Restoring from backup: {backup_path}")
        
        # Restore from backup
        success = await storage_manager.restore_from_backup(
            backup_path=backup_path,
            decrypt=decrypt,
            download_from_cloud=download_from_cloud
        )
        
        if success:
            logger.info(f"Backup restored successfully from {backup_path}")
            
            # Publish event
            event_bus.publish("backup:restored", {
                "path": backup_path,
                "timestamp": datetime.datetime.now().isoformat()
            })
            
            return True
        else:
            logger.error(f"Failed to restore backup from {backup_path}")
            return False
        
    except Exception as e:
        logger.error(f"Error restoring backup: {str(e)}")
        return False

async def list_backups(include_cloud=False):
    """
    Lists all available backups.
    
    Args:
        include_cloud (bool): Whether to include cloud backups
        
    Returns:
        list: List of backup metadata
    """
    try:
        # Initialize StorageManager
        storage_manager = StorageManager()
        await storage_manager.initialize()
        
        logger.info(f"Listing backups (include_cloud={include_cloud})")
        
        # Get list of backups
        backups = await storage_manager.list_backups(include_cloud=include_cloud)
        
        # Sort by creation time (newest first)
        backups.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        return backups
        
    except Exception as e:
        logger.error(f"Error listing backups: {str(e)}")
        return []

async def delete_backup(backup_name, delete_from_cloud=False):
    """
    Deletes a specific backup.
    
    Args:
        backup_name (str): Name or path of the backup to delete
        delete_from_cloud (bool): Whether to delete from cloud storage
        
    Returns:
        bool: True if deletion was successful
    """
    try:
        # Initialize StorageManager
        storage_manager = StorageManager()
        await storage_manager.initialize()
        
        logger.info(f"Deleting backup: {backup_name} (delete_from_cloud={delete_from_cloud})")
        
        # Delete backup
        success = await storage_manager.delete_backup(
            backup_name=backup_name,
            delete_from_cloud=delete_from_cloud
        )
        
        if success:
            logger.info(f"Backup deleted successfully: {backup_name}")
            
            # Publish event
            event_bus.publish("backup:deleted", {
                "name": backup_name,
                "timestamp": datetime.datetime.now().isoformat()
            })
            
            return True
        else:
            logger.error(f"Failed to delete backup: {backup_name}")
            return False
        
    except Exception as e:
        logger.error(f"Error deleting backup: {str(e)}")
        return False

async def cleanup_old_backups(max_backups=5, include_cloud=False):
    """
    Removes old backups based on retention policy.
    
    Args:
        max_backups (int): Maximum number of backups to keep
        include_cloud (bool): Whether to clean up cloud backups
        
    Returns:
        int: Number of backups deleted
    """
    try:
        # Initialize StorageManager
        storage_manager = StorageManager()
        await storage_manager.initialize()
        
        logger.info(f"Cleaning up old backups (max_backups={max_backups}, include_cloud={include_cloud})")
        
        # Get list of backups
        backups = await storage_manager.list_backups(include_cloud=include_cloud)
        
        # Sort by creation time (oldest first)
        backups.sort(key=lambda x: x.get("created_at", ""))
        
        # Determine how many backups to delete
        delete_count = max(0, len(backups) - max_backups)
        
        if delete_count == 0:
            logger.info(f"No backups to delete (current count: {len(backups)}, max: {max_backups})")
            return 0
        
        # Delete oldest backups beyond retention limit
        deleted_count = 0
        for i in range(delete_count):
            if i < len(backups):
                backup = backups[i]
                backup_path = backup.get("path")
                location = backup.get("location", "local")
                
                if location == "local" or (location == "cloud" and include_cloud):
                    if await storage_manager.delete_backup(
                        backup_name=backup_path,
                        delete_from_cloud=(location == "cloud")
                    ):
                        deleted_count += 1
        
        logger.info(f"Deleted {deleted_count} old backups")
        
        # Publish event
        event_bus.publish("backup:cleaned", {
            "count": deleted_count,
            "timestamp": datetime.datetime.now().isoformat()
        })
        
        return deleted_count
        
    except Exception as e:
        logger.error(f"Error cleaning up old backups: {str(e)}")
        return 0

async def verify_backup_integrity(backup_path):
    """
    Verifies the integrity of a backup.
    
    Args:
        backup_path (str): Path to the backup
        
    Returns:
        bool: True if backup is valid
    """
    try:
        # Check if backup path exists
        if not os.path.exists(backup_path):
            logger.error(f"Backup path does not exist: {backup_path}")
            return False
        
        logger.info(f"Verifying backup integrity: {backup_path}")
        
        # Check if it's a directory or archive
        if os.path.isdir(backup_path):
            # Verify metadata file exists
            metadata_path = os.path.join(backup_path, "metadata.json")
            if not os.path.exists(metadata_path):
                logger.error(f"Backup metadata file not found: {metadata_path}")
                return False
            
            # Load and validate metadata
            try:
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                
                # Check for required fields
                required_fields = ["timestamp", "version", "contents"]
                for field in required_fields:
                    if field not in metadata:
                        logger.error(f"Missing required field in backup metadata: {field}")
                        return False
                
                # Check for required backup components
                contents = metadata.get("contents", {})
                if not contents.get("sqlite", False) and not contents.get("vector", False):
                    logger.error("Backup does not contain any database components")
                    return False
                
                # Verify database files exist
                if contents.get("sqlite", False):
                    sqlite_path = os.path.join(backup_path, "sqlite.db")
                    if not os.path.exists(sqlite_path):
                        logger.error(f"SQLite database file not found: {sqlite_path}")
                        return False
                
                if contents.get("vector", False):
                    vector_path = os.path.join(backup_path, "vector_db")
                    if not os.path.exists(vector_path) or not os.path.isdir(vector_path):
                        logger.error(f"Vector database directory not found: {vector_path}")
                        return False
            
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON in backup metadata file: {metadata_path}")
                return False
            except Exception as e:
                logger.error(f"Error validating backup metadata: {str(e)}")
                return False
        
        elif backup_path.endswith('.enc'):
            # Cannot verify encrypted backup contents without decryption
            # Just verify the file exists and has a reasonable size
            if os.path.getsize(backup_path) < 1024:  # Minimum 1KB
                logger.error(f"Encrypted backup file is too small: {backup_path}")
                return False
            
            logger.info(f"Encrypted backup exists and has valid size: {backup_path}")
            return True
        
        elif backup_path.endswith('.zip'):
            # Verify zip file integrity
            import zipfile
            try:
                with zipfile.ZipFile(backup_path, 'r') as zip_ref:
                    # Test zip file integrity
                    test_result = zip_ref.testzip()
                    if test_result is not None:
                        logger.error(f"Zip file is corrupted at: {test_result}")
                        return False
                    
                    # Check for required files
                    file_list = zip_ref.namelist()
                    if "metadata.json" not in file_list:
                        logger.error("Backup zip does not contain metadata.json")
                        return False
            except zipfile.BadZipFile:
                logger.error(f"Invalid zip file: {backup_path}")
                return False
            except Exception as e:
                logger.error(f"Error validating zip backup: {str(e)}")
                return False
        
        else:
            logger.error(f"Unsupported backup format: {backup_path}")
            return False
        
        logger.info(f"Backup integrity verification passed: {backup_path}")
        return True
        
    except Exception as e:
        logger.error(f"Error verifying backup integrity: {str(e)}")
        return False

def schedule_backup(frequency="daily", include_files=True, encrypt=True, upload_to_cloud=False, retention_count=5):
    """
    Sets up scheduled automatic backups.
    
    Args:
        frequency (str): Frequency of backups ('daily', 'weekly', 'monthly')
        include_files (bool): Whether to include files in the backup
        encrypt (bool): Whether to encrypt the backup
        upload_to_cloud (bool): Whether to upload the backup to cloud storage
        retention_count (int): Number of backups to keep
        
    Returns:
        bool: True if scheduling was successful
    """
    try:
        # Validate frequency parameter
        if frequency not in ["daily", "weekly", "monthly"]:
            logger.error(f"Invalid frequency: {frequency}")
            return False
        
        logger.info(f"Scheduling {frequency} backups (include_files={include_files}, "
                    f"encrypt={encrypt}, upload_to_cloud={upload_to_cloud}, "
                    f"retention_count={retention_count})")
        
        # Define job function
        def backup_job():
            asyncio.run(run_scheduled_backup(
                include_files=include_files,
                encrypt=encrypt,
                upload_to_cloud=upload_to_cloud,
                retention_count=retention_count
            ))
        
        # Schedule job based on frequency
        if frequency == "daily":
            schedule.every().day.at("02:00").do(backup_job)  # Run at 2 AM
        elif frequency == "weekly":
            schedule.every().monday.at("02:00").do(backup_job)  # Run at 2 AM on Mondays
        elif frequency == "monthly":
            schedule.every().month.at("1-00:00").do(backup_job)  # Run at midnight on the 1st of each month
        
        # Start the scheduler in a separate thread
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
        
        logger.info(f"Backup scheduling successful with frequency: {frequency}")
        
        # Update settings
        settings.set('storage.backup.enabled', True)
        settings.set('storage.backup.frequency', frequency)
        settings.set('storage.backup.include_files', include_files)
        settings.set('storage.backup.encrypt', encrypt)
        settings.set('storage.backup.cloud_enabled', upload_to_cloud)
        settings.set('storage.backup.retention_count', retention_count)
        
        return True
        
    except Exception as e:
        logger.error(f"Error scheduling backup: {str(e)}")
        return False

def run_scheduler():
    """
    Runs the scheduler for background jobs.
    """
    try:
        logger.info("Starting scheduler")
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
    except Exception as e:
        logger.error(f"Error in scheduler: {str(e)}")

async def run_scheduled_backup(include_files=True, encrypt=True, upload_to_cloud=False, retention_count=5):
    """
    Executes a scheduled backup job.
    
    Args:
        include_files (bool): Whether to include files in the backup
        encrypt (bool): Whether to encrypt the backup
        upload_to_cloud (bool): Whether to upload the backup to cloud storage
        retention_count (int): Number of backups to keep
    """
    try:
        logger.info("Running scheduled backup")
        
        # Generate backup name with timestamp
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"scheduled_backup_{timestamp}"
        
        # Create backup
        backup_result = await create_backup(
            backup_name=backup_name,
            include_files=include_files,
            encrypt=encrypt,
            upload_to_cloud=upload_to_cloud
        )
        
        if backup_result.get("success", False):
            logger.info(f"Scheduled backup completed successfully: {backup_name}")
            
            # Clean up old backups
            deleted_count = await cleanup_old_backups(
                max_backups=retention_count,
                include_cloud=upload_to_cloud
            )
            logger.info(f"Cleaned up {deleted_count} old backups")
        else:
            logger.error(f"Scheduled backup failed: {backup_result.get('error', 'Unknown error')}")
            
    except Exception as e:
        logger.error(f"Error running scheduled backup: {str(e)}")

async def main():
    """
    Main entry point for the backup manager script.
    
    Returns:
        int: Exit code (0 for success, non-zero for errors)
    """
    try:
        # Set up logging
        setup_logging()
        
        # Parse command-line arguments
        args = parse_arguments()
        
        # Execute requested operation
        if args.operation == "create":
            result = await create_backup(
                backup_name=args.name,
                include_files=args.include_files,
                encrypt=args.encrypt,
                upload_to_cloud=args.cloud
            )
            
            if result.get("success", False):
                print(f"Backup created successfully at: {result.get('path')}")
                return 0
            else:
                print(f"Backup creation failed: {result.get('error', 'Unknown error')}")
                return 1
                
        elif args.operation == "restore":
            if not args.name:
                print("Error: Backup name or path is required for restore operation")
                return 1
                
            success = await restore_backup(
                backup_path=args.name,
                decrypt=True,  # Always try to decrypt if needed
                download_from_cloud=args.cloud
            )
            
            if success:
                print(f"Backup restored successfully from: {args.name}")
                return 0
            else:
                print(f"Backup restoration failed from: {args.name}")
                return 1
                
        elif args.operation == "list":
            backups = await list_backups(include_cloud=args.cloud)
            
            if backups:
                print(f"Found {len(backups)} backups:")
                for i, backup in enumerate(backups, 1):
                    location = backup.get("location", "local")
                    created_at = backup.get("created_at", "Unknown")
                    path = backup.get("path", "Unknown")
                    size = backup.get("size", 0)
                    size_str = f"{size / (1024*1024):.2f} MB" if size else "Unknown size"
                    encrypted = backup.get("encrypted", False)
                    
                    print(f"{i}. [{location.upper()}] {os.path.basename(path)}")
                    print(f"   Created: {created_at}")
                    print(f"   Size: {size_str}")
                    print(f"   Encrypted: {'Yes' if encrypted else 'No'}")
                    print(f"   Path: {path}")
                    print()
                    
                return 0
            else:
                print("No backups found")
                return 0
                
        elif args.operation == "delete":
            if not args.name:
                print("Error: Backup name or path is required for delete operation")
                return 1
                
            success = await delete_backup(
                backup_name=args.name,
                delete_from_cloud=args.cloud
            )
            
            if success:
                print(f"Backup deleted successfully: {args.name}")
                return 0
            else:
                print(f"Backup deletion failed: {args.name}")
                return 1
                
        elif args.operation == "schedule":
            success = schedule_backup(
                frequency=args.frequency,
                include_files=args.include_files,
                encrypt=args.encrypt,
                upload_to_cloud=args.cloud,
                retention_count=args.retention
            )
            
            if success:
                print(f"Backup scheduling successful with frequency: {args.frequency}")
                print(f"Next backup will run at the configured time")
                return 0
            else:
                print("Backup scheduling failed")
                return 1
                
        elif args.operation == "verify":
            if not args.name:
                print("Error: Backup name or path is required for verify operation")
                return 1
                
            valid = await verify_backup_integrity(args.name)
            
            if valid:
                print(f"Backup integrity verification passed: {args.name}")
                return 0
            else:
                print(f"Backup integrity verification failed: {args.name}")
                return 1
                
        else:
            print(f"Error: Unknown operation: {args.operation}")
            return 1
            
    except Exception as e:
        logger.error(f"Error in main: {str(e)}")
        print(f"Error: {str(e)}")
        return 1

def run_cli():
    """
    Entry point for command-line execution.
    """
    sys.exit(asyncio.run(main()))

class BackupManager:
    """
    Manages backup operations for the Personal AI Agent.
    
    This class provides methods for creating, restoring, listing, and managing backups,
    as well as scheduling automated backups and verifying backup integrity.
    """
    
    def __init__(self, backup_dir=None):
        """
        Initializes the backup manager with settings.
        
        Args:
            backup_dir (str): Optional custom backup directory path
        """
        self.backup_dir = backup_dir or settings.get('storage.backup_dir', DEFAULT_BACKUP_DIR)
        self.storage_manager = None
        self.initialized = False
        self.scheduler = schedule.Scheduler()
        
        logger.info(f"Initializing BackupManager with backup directory: {self.backup_dir}")
    
    async def initialize(self):
        """
        Initializes the backup manager and storage components.
        
        Returns:
            bool: True if initialization successful
        """
        try:
            # Validate backup directory
            if not validate_backup_directory(self.backup_dir):
                logger.error(f"Invalid backup directory: {self.backup_dir}")
                return False
            
            # Initialize StorageManager
            self.storage_manager = StorageManager()
            await self.storage_manager.initialize()
            
            self.initialized = True
            logger.info("BackupManager initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error initializing BackupManager: {str(e)}")
            return False
    
    async def create_backup(self, backup_name=None, include_files=True, encrypt=True, upload_to_cloud=False):
        """
        Creates a new backup with the given parameters.
        
        Args:
            backup_name (str): Optional name for the backup
            include_files (bool): Whether to include files in the backup
            encrypt (bool): Whether to encrypt the backup
            upload_to_cloud (bool): Whether to upload the backup to cloud storage
            
        Returns:
            dict: Backup metadata including status and path
        """
        try:
            # Initialize if not already initialized
            if not self.initialized:
                if not await self.initialize():
                    return {"success": False, "error": "Failed to initialize BackupManager"}
            
            # Generate backup name with timestamp if not provided
            if not backup_name:
                timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                backup_name = f"backup_{timestamp}"
            
            logger.info(f"Creating backup: {backup_name}")
            
            # Create backup
            backup_metadata = await self.storage_manager.create_backup(
                backup_name=backup_name,
                include_files=include_files,
                encrypt=encrypt,
                upload_to_cloud=upload_to_cloud
            )
            
            if backup_metadata.get("success", False):
                logger.info(f"Backup created successfully: {backup_name}")
                
                # Publish event
                event_bus.publish("backup:created", {
                    "name": backup_name,
                    "path": backup_metadata.get("path"),
                    "encrypted": encrypt,
                    "cloud": upload_to_cloud,
                    "timestamp": datetime.datetime.now().isoformat()
                })
            else:
                logger.error(f"Failed to create backup: {backup_metadata.get('error', 'Unknown error')}")
            
            return backup_metadata
            
        except Exception as e:
            logger.error(f"Error creating backup: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def restore_backup(self, backup_path, decrypt=True, download_from_cloud=False):
        """
        Restores data from an existing backup.
        
        Args:
            backup_path (str): Path to the backup
            decrypt (bool): Whether to decrypt the backup
            download_from_cloud (bool): Whether to download the backup from cloud storage
            
        Returns:
            bool: True if restore was successful
        """
        try:
            # Initialize if not already initialized
            if not self.initialized:
                if not await self.initialize():
                    return False
            
            # Validate backup path
            if not os.path.exists(backup_path) and not download_from_cloud:
                logger.error(f"Backup path does not exist: {backup_path}")
                return False
            
            logger.info(f"Restoring from backup: {backup_path}")
            
            # Restore from backup
            success = await self.storage_manager.restore_from_backup(
                backup_path=backup_path,
                decrypt=decrypt,
                download_from_cloud=download_from_cloud
            )
            
            if success:
                logger.info(f"Backup restored successfully from {backup_path}")
                
                # Publish event
                event_bus.publish("backup:restored", {
                    "path": backup_path,
                    "timestamp": datetime.datetime.now().isoformat()
                })
            else:
                logger.error(f"Failed to restore backup from {backup_path}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error restoring backup: {str(e)}")
            return False
    
    async def list_backups(self, include_cloud=False):
        """
        Lists all available backups.
        
        Args:
            include_cloud (bool): Whether to include cloud backups
            
        Returns:
            list: List of backup metadata
        """
        try:
            # Initialize if not already initialized
            if not self.initialized:
                if not await self.initialize():
                    return []
            
            logger.info(f"Listing backups (include_cloud={include_cloud})")
            
            # Get list of backups
            backups = await self.storage_manager.list_backups(include_cloud=include_cloud)
            
            # Sort by creation time (newest first)
            backups.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            
            return backups
            
        except Exception as e:
            logger.error(f"Error listing backups: {str(e)}")
            return []
    
    async def delete_backup(self, backup_name, delete_from_cloud=False):
        """
        Deletes a specific backup.
        
        Args:
            backup_name (str): Name or path of the backup to delete
            delete_from_cloud (bool): Whether to delete from cloud storage
            
        Returns:
            bool: True if deletion was successful
        """
        try:
            # Initialize if not already initialized
            if not self.initialized:
                if not await self.initialize():
                    return False
            
            logger.info(f"Deleting backup: {backup_name} (delete_from_cloud={delete_from_cloud})")
            
            # Delete backup
            success = await self.storage_manager.delete_backup(
                backup_name=backup_name,
                delete_from_cloud=delete_from_cloud
            )
            
            if success:
                logger.info(f"Backup deleted successfully: {backup_name}")
                
                # Publish event
                event_bus.publish("backup:deleted", {
                    "name": backup_name,
                    "timestamp": datetime.datetime.now().isoformat()
                })
            else:
                logger.error(f"Failed to delete backup: {backup_name}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error deleting backup: {str(e)}")
            return False
    
    async def cleanup_old_backups(self, max_backups=5, include_cloud=False):
        """
        Removes old backups based on retention policy.
        
        Args:
            max_backups (int): Maximum number of backups to keep
            include_cloud (bool): Whether to clean up cloud backups
            
        Returns:
            int: Number of backups deleted
        """
        try:
            # Initialize if not already initialized
            if not self.initialized:
                if not await self.initialize():
                    return 0
            
            logger.info(f"Cleaning up old backups (max_backups={max_backups}, include_cloud={include_cloud})")
            
            # Get list of backups
            backups = await self.storage_manager.list_backups(include_cloud=include_cloud)
            
            # Sort by creation time (oldest first)
            backups.sort(key=lambda x: x.get("created_at", ""))
            
            # Determine how many backups to delete
            delete_count = max(0, len(backups) - max_backups)
            
            if delete_count == 0:
                logger.info(f"No backups to delete (current count: {len(backups)}, max: {max_backups})")
                return 0
            
            # Delete oldest backups beyond retention limit
            deleted_count = 0
            for i in range(delete_count):
                if i < len(backups):
                    backup = backups[i]
                    backup_path = backup.get("path")
                    location = backup.get("location", "local")
                    
                    if location == "local" or (location == "cloud" and include_cloud):
                        if await self.storage_manager.delete_backup(
                            backup_name=backup_path,
                            delete_from_cloud=(location == "cloud")
                        ):
                            deleted_count += 1
            
            logger.info(f"Deleted {deleted_count} old backups")
            
            # Publish event
            event_bus.publish("backup:cleaned", {
                "count": deleted_count,
                "timestamp": datetime.datetime.now().isoformat()
            })
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up old backups: {str(e)}")
            return 0
    
    async def verify_backup_integrity(self, backup_path):
        """
        Verifies the integrity of a backup.
        
        Args:
            backup_path (str): Path to the backup
            
        Returns:
            bool: True if backup is valid
        """
        try:
            # Check if backup path exists
            if not os.path.exists(backup_path):
                logger.error(f"Backup path does not exist: {backup_path}")
                return False
            
            logger.info(f"Verifying backup integrity: {backup_path}")
            
            # Check if it's a directory or archive
            if os.path.isdir(backup_path):
                # Verify metadata file exists
                metadata_path = os.path.join(backup_path, "metadata.json")
                if not os.path.exists(metadata_path):
                    logger.error(f"Backup metadata file not found: {metadata_path}")
                    return False
                
                # Load and validate metadata
                try:
                    with open(metadata_path, 'r') as f:
                        metadata = json.load(f)
                    
                    # Check for required fields
                    required_fields = ["timestamp", "version", "contents"]
                    for field in required_fields:
                        if field not in metadata:
                            logger.error(f"Missing required field in backup metadata: {field}")
                            return False
                    
                    # Check for required backup components
                    contents = metadata.get("contents", {})
                    if not contents.get("sqlite", False) and not contents.get("vector", False):
                        logger.error("Backup does not contain any database components")
                        return False
                    
                    # Verify database files exist
                    if contents.get("sqlite", False):
                        sqlite_path = os.path.join(backup_path, "sqlite.db")
                        if not os.path.exists(sqlite_path):
                            logger.error(f"SQLite database file not found: {sqlite_path}")
                            return False
                    
                    if contents.get("vector", False):
                        vector_path = os.path.join(backup_path, "vector_db")
                        if not os.path.exists(vector_path) or not os.path.isdir(vector_path):
                            logger.error(f"Vector database directory not found: {vector_path}")
                            return False
                
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON in backup metadata file: {metadata_path}")
                    return False
                except Exception as e:
                    logger.error(f"Error validating backup metadata: {str(e)}")
                    return False
            
            elif backup_path.endswith('.enc'):
                # Cannot verify encrypted backup contents without decryption
                # Just verify the file exists and has a reasonable size
                if os.path.getsize(backup_path) < 1024:  # Minimum 1KB
                    logger.error(f"Encrypted backup file is too small: {backup_path}")
                    return False
                
                logger.info(f"Encrypted backup exists and has valid size: {backup_path}")
                return True
            
            elif backup_path.endswith('.zip'):
                # Verify zip file integrity
                import zipfile
                try:
                    with zipfile.ZipFile(backup_path, 'r') as zip_ref:
                        # Test zip file integrity
                        test_result = zip_ref.testzip()
                        if test_result is not None:
                            logger.error(f"Zip file is corrupted at: {test_result}")
                            return False
                        
                        # Check for required files
                        file_list = zip_ref.namelist()
                        if "metadata.json" not in file_list:
                            logger.error("Backup zip does not contain metadata.json")
                            return False
                except zipfile.BadZipFile:
                    logger.error(f"Invalid zip file: {backup_path}")
                    return False
                except Exception as e:
                    logger.error(f"Error validating zip backup: {str(e)}")
                    return False
            
            else:
                logger.error(f"Unsupported backup format: {backup_path}")
                return False
            
            logger.info(f"Backup integrity verification passed: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error verifying backup integrity: {str(e)}")
            return False
    
    def schedule_backup(self, frequency="daily", include_files=True, encrypt=True, upload_to_cloud=False, retention_count=5):
        """
        Sets up scheduled automatic backups.
        
        Args:
            frequency (str): Frequency of backups ('daily', 'weekly', 'monthly')
            include_files (bool): Whether to include files in the backup
            encrypt (bool): Whether to encrypt the backup
            upload_to_cloud (bool): Whether to upload the backup to cloud storage
            retention_count (int): Number of backups to keep
            
        Returns:
            bool: True if scheduling was successful
        """
        try:
            # Validate frequency parameter
            if frequency not in ["daily", "weekly", "monthly"]:
                logger.error(f"Invalid frequency: {frequency}")
                return False
            
            logger.info(f"Scheduling {frequency} backups (include_files={include_files}, "
                        f"encrypt={encrypt}, upload_to_cloud={upload_to_cloud}, "
                        f"retention_count={retention_count})")
            
            # Define job function
            def backup_job():
                asyncio.run(self.run_scheduled_backup(
                    include_files=include_files,
                    encrypt=encrypt,
                    upload_to_cloud=upload_to_cloud,
                    retention_count=retention_count
                ))
            
            # Clear existing schedules
            self.scheduler.clear()
            
            # Schedule job based on frequency
            if frequency == "daily":
                self.scheduler.every().day.at("02:00").do(backup_job)  # Run at 2 AM
            elif frequency == "weekly":
                self.scheduler.every().monday.at("02:00").do(backup_job)  # Run at 2 AM on Mondays
            elif frequency == "monthly":
                self.scheduler.every().month.at("1-00:00").do(backup_job)  # Run at midnight on the 1st of each month
            
            # Start the scheduler
            success = self.start_scheduler()
            
            if success:
                logger.info(f"Backup scheduling successful with frequency: {frequency}")
                
                # Update settings
                settings.set('storage.backup.enabled', True)
                settings.set('storage.backup.frequency', frequency)
                settings.set('storage.backup.include_files', include_files)
                settings.set('storage.backup.encrypt', encrypt)
                settings.set('storage.backup.cloud_enabled', upload_to_cloud)
                settings.set('storage.backup.retention_count', retention_count)
            
            return success
            
        except Exception as e:
            logger.error(f"Error scheduling backup: {str(e)}")
            return False
    
    async def run_scheduled_backup(self, include_files=True, encrypt=True, upload_to_cloud=False, retention_count=5):
        """
        Executes a scheduled backup job.
        
        Args:
            include_files (bool): Whether to include files in the backup
            encrypt (bool): Whether to encrypt the backup
            upload_to_cloud (bool): Whether to upload the backup to cloud storage
            retention_count (int): Number of backups to keep
        """
        try:
            logger.info("Running scheduled backup")
            
            # Generate backup name with timestamp
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"scheduled_backup_{timestamp}"
            
            # Create backup
            backup_result = await self.create_backup(
                backup_name=backup_name,
                include_files=include_files,
                encrypt=encrypt,
                upload_to_cloud=upload_to_cloud
            )
            
            if backup_result.get("success", False):
                logger.info(f"Scheduled backup completed successfully: {backup_name}")
                
                # Clean up old backups
                deleted_count = await self.cleanup_old_backups(
                    max_backups=retention_count,
                    include_cloud=upload_to_cloud
                )
                logger.info(f"Cleaned up {deleted_count} old backups")
            else:
                logger.error(f"Scheduled backup failed: {backup_result.get('error', 'Unknown error')}")
                
        except Exception as e:
            logger.error(f"Error running scheduled backup: {str(e)}")
    
    def start_scheduler(self):
        """
        Starts the backup scheduler in a separate thread.
        
        Returns:
            bool: True if scheduler started successfully
        """
        try:
            # Start scheduler in a daemon thread
            scheduler_thread = threading.Thread(target=self._run_scheduler, daemon=True)
            scheduler_thread.start()
            
            logger.info("Backup scheduler started")
            return True
            
        except Exception as e:
            logger.error(f"Error starting scheduler: {str(e)}")
            return False
    
    def stop_scheduler(self):
        """
        Stops the backup scheduler.
        
        Returns:
            bool: True if scheduler stopped successfully
        """
        try:
            # Clear all scheduled jobs
            self.scheduler.clear()
            
            logger.info("Backup scheduler stopped")
            return True
            
        except Exception as e:
            logger.error(f"Error stopping scheduler: {str(e)}")
            return False
    
    def _run_scheduler(self):
        """
        Runs the scheduler for background jobs.
        """
        try:
            logger.info("Starting scheduler thread")
            while True:
                self.scheduler.run_pending()
                time.sleep(60)  # Check every minute
        except Exception as e:
            logger.error(f"Error in scheduler thread: {str(e)}")

if __name__ == "__main__":
    run_cli()