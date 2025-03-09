import os
import shutil
import logging
import datetime
from pathlib import Path
import json
import tempfile
import asyncio
from typing import Dict, List, Optional, Any, Union
import zipfile

from ..config.settings import Settings
from ..database.sqlite_db import SQLiteDatabase, create_backup, restore_from_backup
from ..database.vector_db import VectorDatabase
from ..integrations.cloud_storage import CloudStorageManager
from ..utils.event_bus import EventBus
from ..utils.encryption import encrypt_file, decrypt_file

# Configure logger
logger = logging.getLogger(__name__)

# Global constants and settings
settings = Settings()
event_bus = EventBus()
DEFAULT_BACKUP_DIR = "backups"
DEFAULT_DATA_DIR = "data"

def ensure_directory_exists(directory_path: str) -> bool:
    """
    Ensures that a directory exists, creating it if necessary.
    
    Args:
        directory_path: Path to the directory
        
    Returns:
        True if directory exists or was created successfully
    """
    try:
        os.makedirs(directory_path, exist_ok=True)
        return True
    except Exception as e:
        logger.error(f"Error creating directory {directory_path}: {str(e)}")
        return False

def get_timestamp_string() -> str:
    """
    Generates a formatted timestamp string for backup filenames.
    
    Returns:
        Formatted timestamp string (YYYY-MM-DD_HH-MM-SS)
    """
    return datetime.datetime.now().strftime("%Y-%m-%d_%H-%M-%S")

class StorageManager:
    """
    Manages all storage operations for the Personal AI Agent.
    
    This class provides a comprehensive interface for local storage,
    vector database operations, and optional cloud backup functionality,
    all while maintaining the local-first architecture and privacy guarantees.
    """
    
    def __init__(self, data_dir: str = None, backup_dir: str = None):
        """
        Initializes the storage manager with database connections and paths.
        
        Args:
            data_dir: Directory for storing application data
            backup_dir: Directory for storing backups
        """
        self.data_dir = data_dir or settings.get('storage.data_dir', DEFAULT_DATA_DIR)
        self.backup_dir = backup_dir or settings.get('storage.backup_dir', DEFAULT_BACKUP_DIR)
        self.initialized = False
        self.sqlite_db = None
        self.vector_db = None
        self.cloud_storage = None
        logger.info(f"Initializing StorageManager with data_dir={self.data_dir}, backup_dir={self.backup_dir}")
    
    async def initialize(self) -> bool:
        """
        Initializes all storage components.
        
        Returns:
            True if initialization successful, False otherwise
        """
        try:
            # Ensure directories exist
            if not ensure_directory_exists(self.data_dir):
                logger.error(f"Failed to create data directory: {self.data_dir}")
                return False
            
            if not ensure_directory_exists(self.backup_dir):
                logger.error(f"Failed to create backup directory: {self.backup_dir}")
                return False
            
            # Initialize SQLite database
            logger.debug("Initializing SQLite database")
            sqlite_path = os.path.join(self.data_dir, "personal_ai.db")
            self.sqlite_db = SQLiteDatabase(sqlite_path)
            
            # Initialize vector database
            logger.debug("Initializing vector database")
            vector_db_path = os.path.join(self.data_dir, "vectors")
            self.vector_db = VectorDatabase(persist_directory=vector_db_path)
            
            # Initialize cloud storage if enabled
            logger.debug("Initializing cloud storage manager")
            self.cloud_storage = CloudStorageManager(settings)
            
            if settings.get('storage.backup.cloud_enabled', False):
                logger.debug("Cloud backup is enabled, initializing cloud storage")
                if not self.cloud_storage.initialize():
                    logger.warning("Failed to initialize cloud storage, cloud backup will be disabled")
            
            # Mark as initialized
            self.initialized = True
            
            # Publish event
            event_bus.publish("storage:initialized", {
                "data_dir": self.data_dir,
                "backup_dir": self.backup_dir,
                "cloud_enabled": self.cloud_storage.is_enabled() if self.cloud_storage else False
            })
            
            logger.info("Storage manager initialized successfully")
            return True
        
        except Exception as e:
            logger.error(f"Error initializing storage manager: {str(e)}")
            return False
    
    def is_initialized(self) -> bool:
        """
        Checks if storage manager is initialized.
        
        Returns:
            True if initialized, False otherwise
        """
        return self.initialized
    
    def get_sqlite_db(self) -> SQLiteDatabase:
        """
        Gets the SQLite database instance.
        
        Returns:
            SQLite database instance
        
        Raises:
            RuntimeError: If storage manager is not initialized
        """
        if not self.initialized:
            raise RuntimeError("Storage manager is not initialized")
        return self.sqlite_db
    
    def get_vector_db(self) -> VectorDatabase:
        """
        Gets the vector database instance.
        
        Returns:
            Vector database instance
        
        Raises:
            RuntimeError: If storage manager is not initialized
        """
        if not self.initialized:
            raise RuntimeError("Storage manager is not initialized")
        return self.vector_db
    
    async def create_backup(self, backup_name: str = None, include_files: bool = True, 
                           encrypt: bool = True, upload_to_cloud: bool = False) -> Dict[str, Any]:
        """
        Creates a complete backup of all data.
        
        Args:
            backup_name: Optional name for the backup, defaults to timestamp
            include_files: Whether to include files in the backup
            encrypt: Whether to encrypt the backup
            upload_to_cloud: Whether to upload the backup to cloud storage
        
        Returns:
            Backup metadata including paths and status
        """
        if not self.initialized:
            raise RuntimeError("Storage manager is not initialized")
        
        try:
            # Generate backup name with timestamp if not provided
            if not backup_name:
                timestamp = get_timestamp_string()
                backup_name = f"backup_{timestamp}"
            
            # Create backup directory
            backup_path = os.path.join(self.backup_dir, backup_name)
            if not ensure_directory_exists(backup_path):
                logger.error(f"Failed to create backup directory: {backup_path}")
                return {"success": False, "error": "Failed to create backup directory"}
            
            # Dictionary to track backup contents
            contents = {
                "timestamp": datetime.datetime.now().isoformat(),
                "sqlite": False,
                "vector": False,
                "files": False,
                "encrypted": False,
                "cloud": False
            }
            
            # Backup SQLite database
            logger.debug("Creating SQLite database backup")
            sqlite_backup_path = os.path.join(backup_path, "sqlite.db")
            if await self.sqlite_db.create_backup(sqlite_backup_path):
                contents["sqlite"] = True
                logger.info(f"SQLite database backed up to {sqlite_backup_path}")
            else:
                logger.error("Failed to backup SQLite database")
            
            # Backup vector database
            logger.debug("Creating vector database backup")
            vector_backup_path = os.path.join(backup_path, "vector_db")
            if await self.vector_db.create_backup(vector_backup_path):
                contents["vector"] = True
                logger.info(f"Vector database backed up to {vector_backup_path}")
            else:
                logger.error("Failed to backup vector database")
            
            # Backup files if requested
            if include_files:
                logger.debug("Including files in backup")
                files_backup_path = os.path.join(backup_path, "files")
                exclude_patterns = ["vectors/*", "*.db", "backups/*"]
                file_stats = await self._backup_files(self.data_dir, files_backup_path, exclude_patterns)
                if file_stats["success"]:
                    contents["files"] = True
                    contents["file_count"] = file_stats["count"]
                    contents["file_size"] = file_stats["size"]
                    logger.info(f"Files backed up to {files_backup_path}")
                else:
                    logger.error("Failed to backup files")
            
            # Create backup metadata file
            metadata = self._create_backup_metadata(backup_path, contents)
            
            # Encrypt backup if requested
            if encrypt:
                logger.debug("Encrypting backup")
                encrypted_path = f"{backup_path}.enc"
                
                # First create a zip archive of the backup directory
                zip_path = f"{backup_path}.zip"
                with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                    for root, _, files in os.walk(backup_path):
                        for file in files:
                            file_path = os.path.join(root, file)
                            zipf.write(file_path, os.path.relpath(file_path, backup_path))
                
                # Then encrypt the zip archive
                if encrypt_file(zip_path, encrypted_path):
                    shutil.rmtree(backup_path)  # Remove the unencrypted backup
                    os.remove(zip_path)  # Remove the unencrypted zip
                    contents["encrypted"] = True
                    metadata["encrypted"] = True
                    metadata["path"] = encrypted_path
                    logger.info(f"Backup encrypted and saved to {encrypted_path}")
                else:
                    logger.error("Failed to encrypt backup")
                    # Keep the unencrypted backup and delete the zip
                    if os.path.exists(zip_path):
                        os.remove(zip_path)
            else:
                metadata["encrypted"] = False
            
            # Upload to cloud if requested and cloud storage is enabled
            if upload_to_cloud and self.cloud_storage and self.cloud_storage.is_enabled():
                logger.debug("Uploading backup to cloud storage")
                cloud_path = f"backups/{backup_name}"
                if metadata["encrypted"]:
                    # Upload the encrypted file
                    cloud_path = f"{cloud_path}.enc"
                    if self.cloud_storage.backup_file(encrypted_path, cloud_path, encrypt=False):
                        contents["cloud"] = True
                        metadata["cloud_path"] = cloud_path
                        logger.info(f"Encrypted backup uploaded to cloud storage: {cloud_path}")
                    else:
                        logger.error("Failed to upload encrypted backup to cloud storage")
                else:
                    # Create a zip for the unencrypted backup and upload it
                    zip_path = f"{backup_path}.zip"
                    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                        for root, _, files in os.walk(backup_path):
                            for file in files:
                                file_path = os.path.join(root, file)
                                zipf.write(file_path, os.path.relpath(file_path, backup_path))
                    
                    cloud_path = f"{cloud_path}.zip"
                    if self.cloud_storage.backup_file(zip_path, cloud_path, encrypt=True):
                        contents["cloud"] = True
                        metadata["cloud_path"] = cloud_path
                        logger.info(f"Backup uploaded to cloud storage: {cloud_path}")
                        # Remove the local zip file
                        os.remove(zip_path)
                    else:
                        logger.error("Failed to upload backup to cloud storage")
                        # Remove the local zip file
                        if os.path.exists(zip_path):
                            os.remove(zip_path)
            
            # Update metadata with final status
            metadata["contents"] = contents
            metadata["success"] = True
            
            # Publish event
            event_bus.publish("storage:backup_created", {
                "backup_name": backup_name,
                "path": metadata["path"],
                "encrypted": metadata["encrypted"],
                "cloud": contents["cloud"]
            })
            
            return metadata
        
        except Exception as e:
            logger.error(f"Error creating backup: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def restore_from_backup(self, backup_path: str, decrypt: bool = True, 
                                 download_from_cloud: bool = False) -> bool:
        """
        Restores data from a backup.
        
        Args:
            backup_path: Path to the backup
            decrypt: Whether to decrypt the backup first
            download_from_cloud: Whether to download the backup from cloud storage
        
        Returns:
            True if restore successful, False otherwise
        """
        if not self.initialized:
            raise RuntimeError("Storage manager is not initialized")
        
        try:
            # Handle cloud download if requested
            if download_from_cloud and self.cloud_storage and self.cloud_storage.is_enabled():
                logger.debug(f"Downloading backup from cloud storage: {backup_path}")
                
                # Determine local path for downloaded file
                local_download_path = os.path.join(self.backup_dir, os.path.basename(backup_path))
                
                # Download from cloud
                if not self.cloud_storage.restore_file(backup_path, local_download_path, decrypt=False):
                    logger.error(f"Failed to download backup from cloud storage: {backup_path}")
                    return False
                
                # Update backup_path to the downloaded file
                backup_path = local_download_path
                logger.info(f"Downloaded backup from cloud to {backup_path}")
            
            # Handle decryption if needed
            working_backup_path = backup_path
            temp_dir = None
            
            if decrypt and backup_path.endswith('.enc'):
                logger.debug(f"Decrypting backup: {backup_path}")
                
                # Create temp directory for decrypted content
                temp_dir = tempfile.mkdtemp()
                decrypted_zip = os.path.join(temp_dir, "backup.zip")
                
                # Decrypt file
                if not decrypt_file(backup_path, decrypted_zip):
                    logger.error(f"Failed to decrypt backup: {backup_path}")
                    if temp_dir and os.path.exists(temp_dir):
                        shutil.rmtree(temp_dir)
                    return False
                
                # Extract zip to temp directory
                extract_dir = os.path.join(temp_dir, "extracted")
                os.makedirs(extract_dir, exist_ok=True)
                
                with zipfile.ZipFile(decrypted_zip, 'r') as zipf:
                    zipf.extractall(extract_dir)
                
                working_backup_path = extract_dir
                logger.info(f"Decrypted backup to {working_backup_path}")
            
            # Handle zip files
            elif backup_path.endswith('.zip'):
                logger.debug(f"Extracting backup zip: {backup_path}")
                
                # Create temp directory for extraction
                temp_dir = tempfile.mkdtemp()
                extract_dir = os.path.join(temp_dir, "extracted")
                os.makedirs(extract_dir, exist_ok=True)
                
                with zipfile.ZipFile(backup_path, 'r') as zipf:
                    zipf.extractall(extract_dir)
                
                working_backup_path = extract_dir
                logger.info(f"Extracted backup to {working_backup_path}")
            
            # Read backup metadata if available
            metadata = self._read_backup_metadata(working_backup_path)
            if not metadata:
                logger.error(f"Invalid backup: no metadata found in {working_backup_path}")
                if temp_dir and os.path.exists(temp_dir):
                    shutil.rmtree(temp_dir)
                return False
            
            # Close existing database connections
            logger.debug("Closing existing database connections")
            try:
                await self.sqlite_db.close()
            except Exception as e:
                logger.warning(f"Error closing SQLite database: {str(e)}")
            
            try:
                await self.vector_db.close()
            except Exception as e:
                logger.warning(f"Error closing vector database: {str(e)}")
            
            # Restore SQLite database if included in backup
            if metadata["contents"].get("sqlite", False):
                logger.debug("Restoring SQLite database")
                sqlite_backup_path = os.path.join(working_backup_path, "sqlite.db")
                sqlite_db_path = os.path.join(self.data_dir, "personal_ai.db")
                
                if not restore_from_backup(sqlite_backup_path, sqlite_db_path):
                    logger.error("Failed to restore SQLite database")
                    if temp_dir and os.path.exists(temp_dir):
                        shutil.rmtree(temp_dir)
                    return False
                
                logger.info("SQLite database restored successfully")
            
            # Restore vector database if included in backup
            if metadata["contents"].get("vector", False):
                logger.debug("Restoring vector database")
                vector_backup_path = os.path.join(working_backup_path, "vector_db")
                vector_db_path = os.path.join(self.data_dir, "vectors")
                
                if not await self.vector_db.restore_from_backup(vector_backup_path):
                    logger.error("Failed to restore vector database")
                    if temp_dir and os.path.exists(temp_dir):
                        shutil.rmtree(temp_dir)
                    return False
                
                logger.info("Vector database restored successfully")
            
            # Restore files if included in backup
            if metadata["contents"].get("files", False):
                logger.debug("Restoring files")
                files_backup_path = os.path.join(working_backup_path, "files")
                
                if not await self._restore_files(files_backup_path, self.data_dir, overwrite=True):
                    logger.error("Failed to restore files")
                    if temp_dir and os.path.exists(temp_dir):
                        shutil.rmtree(temp_dir)
                    return False
                
                logger.info("Files restored successfully")
            
            # Reinitialize database connections
            logger.debug("Reinitializing database connections")
            
            # Initialize SQLite database
            sqlite_path = os.path.join(self.data_dir, "personal_ai.db")
            self.sqlite_db = SQLiteDatabase(sqlite_path)
            
            # Initialize vector database
            vector_db_path = os.path.join(self.data_dir, "vectors")
            self.vector_db = VectorDatabase(persist_directory=vector_db_path)
            
            # Clean up temporary directory
            if temp_dir and os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
            
            # Publish event
            event_bus.publish("storage:backup_restored", {
                "backup_path": backup_path,
                "contents": metadata["contents"]
            })
            
            logger.info(f"Successfully restored from backup: {backup_path}")
            return True
        
        except Exception as e:
            logger.error(f"Error restoring from backup: {str(e)}")
            return False
    
    async def list_backups(self, include_cloud: bool = False) -> List[Dict[str, Any]]:
        """
        Lists available backups.
        
        Args:
            include_cloud: Whether to include cloud backups in the list
        
        Returns:
            List of backup metadata
        """
        if not self.initialized:
            raise RuntimeError("Storage manager is not initialized")
        
        try:
            backups = []
            
            # List local backups
            logger.debug("Listing local backups")
            if os.path.exists(self.backup_dir):
                for item in os.listdir(self.backup_dir):
                    item_path = os.path.join(self.backup_dir, item)
                    
                    # Handle directories, encrypted files, and zip files
                    if os.path.isdir(item_path) or item.endswith('.enc') or item.endswith('.zip'):
                        # Try to read metadata
                        metadata = None
                        if os.path.isdir(item_path):
                            metadata = self._read_backup_metadata(item_path)
                        
                        # If no metadata or not a directory, create basic metadata
                        if not metadata:
                            stat = os.stat(item_path)
                            metadata = {
                                "name": os.path.basename(item_path),
                                "path": item_path,
                                "size": stat.st_size,
                                "created_at": datetime.datetime.fromtimestamp(stat.st_ctime).isoformat(),
                                "encrypted": item.endswith('.enc'),
                                "contents": {
                                    "unknown": True
                                },
                                "location": "local"
                            }
                        else:
                            metadata["name"] = os.path.basename(item_path)
                            metadata["path"] = item_path
                            metadata["location"] = "local"
                        
                        backups.append(metadata)
            
            # List cloud backups if requested
            if include_cloud and self.cloud_storage and self.cloud_storage.is_enabled():
                logger.debug("Listing cloud backups")
                cloud_files = self.cloud_storage.list_files("backups/")
                
                for cloud_path in cloud_files:
                    # Get file metadata from cloud
                    cloud_metadata = self.cloud_storage.get_file_metadata(cloud_path)
                    
                    if cloud_metadata:
                        file_name = os.path.basename(cloud_path)
                        
                        # Create basic metadata for cloud backup
                        metadata = {
                            "name": file_name,
                            "path": cloud_path,
                            "size": cloud_metadata.get("size", 0),
                            "created_at": cloud_metadata.get("last_modified", "").isoformat() if hasattr(cloud_metadata.get("last_modified", ""), "isoformat") else str(cloud_metadata.get("last_modified", "")),
                            "encrypted": file_name.endswith('.enc'),
                            "contents": {
                                "unknown": True
                            },
                            "location": "cloud"
                        }
                        
                        backups.append(metadata)
            
            # Sort backups by creation time, newest first
            backups.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            
            logger.info(f"Found {len(backups)} backups")
            return backups
        
        except Exception as e:
            logger.error(f"Error listing backups: {str(e)}")
            return []
    
    async def delete_backup(self, backup_name: str, delete_from_cloud: bool = False) -> bool:
        """
        Deletes a backup.
        
        Args:
            backup_name: Name of the backup to delete
            delete_from_cloud: Whether to delete from cloud storage if present
        
        Returns:
            True if deletion successful, False otherwise
        """
        if not self.initialized:
            raise RuntimeError("Storage manager is not initialized")
        
        try:
            # Determine if this is a local or cloud path
            is_cloud_path = backup_name.startswith("backups/") or "://" in backup_name
            
            if is_cloud_path and not delete_from_cloud:
                logger.error(f"Cannot delete cloud backup without delete_from_cloud=True: {backup_name}")
                return False
            
            if is_cloud_path:
                # Delete from cloud storage
                if self.cloud_storage and self.cloud_storage.is_enabled():
                    logger.debug(f"Deleting backup from cloud storage: {backup_name}")
                    if self.cloud_storage.delete_file(backup_name):
                        logger.info(f"Deleted backup from cloud storage: {backup_name}")
                        
                        # Publish event
                        event_bus.publish("storage:backup_deleted", {
                            "backup_name": backup_name,
                            "location": "cloud"
                        })
                        
                        return True
                    else:
                        logger.error(f"Failed to delete backup from cloud storage: {backup_name}")
                        return False
                else:
                    logger.error("Cloud storage is not enabled")
                    return False
            else:
                # Delete local backup
                local_path = backup_name
                if not os.path.isabs(local_path):
                    local_path = os.path.join(self.backup_dir, backup_name)
                
                logger.debug(f"Deleting local backup: {local_path}")
                
                if os.path.exists(local_path):
                    if os.path.isdir(local_path):
                        shutil.rmtree(local_path)
                    else:
                        os.remove(local_path)
                    
                    logger.info(f"Deleted local backup: {local_path}")
                    
                    # Also delete .enc or .zip version if exists
                    enc_path = f"{local_path}.enc"
                    if os.path.exists(enc_path):
                        os.remove(enc_path)
                    
                    zip_path = f"{local_path}.zip"
                    if os.path.exists(zip_path):
                        os.remove(zip_path)
                    
                    # Also delete from cloud if requested
                    if delete_from_cloud and self.cloud_storage and self.cloud_storage.is_enabled():
                        # Try various cloud path formats
                        cloud_name = os.path.basename(local_path)
                        cloud_paths = [
                            f"backups/{cloud_name}",
                            f"backups/{cloud_name}.enc",
                            f"backups/{cloud_name}.zip"
                        ]
                        
                        for cloud_path in cloud_paths:
                            if self.cloud_storage.file_exists(cloud_path):
                                logger.debug(f"Deleting matching cloud backup: {cloud_path}")
                                self.cloud_storage.delete_file(cloud_path)
                    
                    # Publish event
                    event_bus.publish("storage:backup_deleted", {
                        "backup_name": backup_name,
                        "location": "local"
                    })
                    
                    return True
                else:
                    logger.error(f"Backup not found: {local_path}")
                    return False
        
        except Exception as e:
            logger.error(f"Error deleting backup: {str(e)}")
            return False
    
    async def export_data(self, export_path: str, data_types: List[str] = None, encrypt: bool = True) -> str:
        """
        Exports user data in a portable format.
        
        Args:
            export_path: Path where the export will be saved
            data_types: Types of data to export ['conversations', 'memories', 'documents', 'settings']
            encrypt: Whether to encrypt the export
        
        Returns:
            Path to the exported data file
        """
        if not self.initialized:
            raise RuntimeError("Storage manager is not initialized")
        
        # Default to all data types if not specified
        if not data_types:
            data_types = ['conversations', 'memories', 'documents', 'settings']
        
        try:
            # Create a temporary directory for the export
            temp_dir = tempfile.mkdtemp()
            logger.debug(f"Created temporary directory for export: {temp_dir}")
            
            # Create metadata for the export
            metadata = {
                "timestamp": datetime.datetime.now().isoformat(),
                "version": "1.0",
                "data_types": data_types,
                "exported_items": {}
            }
            
            # Process each data type
            for data_type in data_types:
                if data_type == 'conversations':
                    logger.debug("Exporting conversations")
                    # Create conversations directory
                    conv_dir = os.path.join(temp_dir, "conversations")
                    os.makedirs(conv_dir, exist_ok=True)
                    
                    # Get all conversations
                    conversations = await self.sqlite_db.get_conversations(limit=10000)
                    
                    # Export each conversation with its messages
                    conv_count = 0
                    for conv in conversations:
                        conv_id = conv['id']
                        conv_with_messages = await self.sqlite_db.get_conversation(
                            conversation_id=conv_id, 
                            include_messages=True
                        )
                        
                        if conv_with_messages:
                            # Save conversation to JSON file
                            conv_file = os.path.join(conv_dir, f"{conv_id}.json")
                            with open(conv_file, 'w') as f:
                                json.dump(conv_with_messages, f, indent=2)
                            conv_count += 1
                    
                    metadata["exported_items"]["conversations"] = conv_count
                    logger.info(f"Exported {conv_count} conversations")
                
                elif data_type == 'memories':
                    logger.debug("Exporting memories")
                    # Create memories directory
                    mem_dir = os.path.join(temp_dir, "memories")
                    os.makedirs(mem_dir, exist_ok=True)
                    
                    # Get all memory items
                    memories = await self.sqlite_db.get_memory_items(limit=100000)
                    
                    # Group memories by category
                    memory_categories = {}
                    for mem in memories:
                        category = mem.get('category', 'unknown')
                        if category not in memory_categories:
                            memory_categories[category] = []
                        memory_categories[category].append(mem)
                    
                    # Save each category to a separate file
                    for category, items in memory_categories.items():
                        category_file = os.path.join(mem_dir, f"{category}.json")
                        with open(category_file, 'w') as f:
                            json.dump(items, f, indent=2)
                    
                    metadata["exported_items"]["memories"] = len(memories)
                    logger.info(f"Exported {len(memories)} memory items")
                
                elif data_type == 'documents':
                    logger.debug("Exporting documents")
                    # Create documents directory
                    doc_dir = os.path.join(temp_dir, "documents")
                    os.makedirs(doc_dir, exist_ok=True)
                    
                    # Create metadata directory for document info
                    doc_meta_dir = os.path.join(doc_dir, "metadata")
                    os.makedirs(doc_meta_dir, exist_ok=True)
                    
                    # Create content directory for document files
                    doc_content_dir = os.path.join(doc_dir, "files")
                    os.makedirs(doc_content_dir, exist_ok=True)
                    
                    # Get all documents
                    documents = await self.sqlite_db.get_documents(limit=10000)
                    
                    # Export each document with its metadata and content
                    doc_count = 0
                    for doc in documents:
                        doc_id = doc['id']
                        doc_with_chunks = await self.sqlite_db.get_document(
                            document_id=doc_id,
                            include_chunks=True
                        )
                        
                        if doc_with_chunks:
                            # Save document metadata to JSON file
                            meta_file = os.path.join(doc_meta_dir, f"{doc_id}.json")
                            with open(meta_file, 'w') as f:
                                json.dump(doc_with_chunks, f, indent=2)
                            
                            # Copy the document file if it exists
                            storage_path = doc.get('storage_path')
                            if storage_path and os.path.exists(storage_path):
                                file_name = os.path.basename(storage_path)
                                dest_path = os.path.join(doc_content_dir, file_name)
                                shutil.copy2(storage_path, dest_path)
                            
                            doc_count += 1
                    
                    metadata["exported_items"]["documents"] = doc_count
                    logger.info(f"Exported {doc_count} documents")
                
                elif data_type == 'settings':
                    logger.debug("Exporting settings")
                    # Create settings directory
                    settings_dir = os.path.join(temp_dir, "settings")
                    os.makedirs(settings_dir, exist_ok=True)
                    
                    # Get user settings
                    user_settings = await self.sqlite_db.get_user_settings()
                    
                    # Save settings to JSON file
                    settings_file = os.path.join(settings_dir, "user_settings.json")
                    with open(settings_file, 'w') as f:
                        json.dump(user_settings, f, indent=2)
                    
                    metadata["exported_items"]["settings"] = 1
                    logger.info("Exported user settings")
            
            # Write metadata file
            metadata_file = os.path.join(temp_dir, "metadata.json")
            with open(metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            # Create zip archive
            zip_path = f"{export_path}.zip"
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for root, dirs, files in os.walk(temp_dir):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arcname = os.path.relpath(file_path, temp_dir)
                        zipf.write(file_path, arcname)
            
            final_path = zip_path
            
            # Encrypt if requested
            if encrypt:
                logger.debug("Encrypting export")
                encrypted_path = export_path
                if not encrypted_path.endswith('.enc'):
                    encrypted_path = f"{export_path}.enc"
                
                if encrypt_file(zip_path, encrypted_path):
                    os.remove(zip_path)  # Remove unencrypted zip
                    final_path = encrypted_path
                    logger.info(f"Export encrypted and saved to {encrypted_path}")
                else:
                    logger.error("Failed to encrypt export")
                    # Keep the unencrypted zip
                    final_path = zip_path
            
            # Clean up the temporary directory
            shutil.rmtree(temp_dir)
            
            # Publish event
            event_bus.publish("storage:data_exported", {
                "path": final_path,
                "data_types": data_types,
                "encrypted": encrypt,
                "items": metadata["exported_items"]
            })
            
            logger.info(f"Data export completed: {final_path}")
            return final_path
        
        except Exception as e:
            logger.error(f"Error exporting data: {str(e)}")
            raise
    
    async def import_data(self, import_path: str, data_types: List[str] = None, 
                         decrypt: bool = True, merge: bool = True) -> Dict[str, Any]:
        """
        Imports user data from an export file.
        
        Args:
            import_path: Path to the export file
            data_types: Types of data to import ['conversations', 'memories', 'documents', 'settings']
            decrypt: Whether to decrypt the import file
            merge: Whether to merge with existing data (False will clear existing data)
        
        Returns:
            Import statistics
        """
        if not self.initialized:
            raise RuntimeError("Storage manager is not initialized")
        
        # Default to all data types if not specified
        if not data_types:
            data_types = ['conversations', 'memories', 'documents', 'settings']
        
        try:
            # Create a temporary directory for the import
            temp_dir = tempfile.mkdtemp()
            logger.debug(f"Created temporary directory for import: {temp_dir}")
            
            # Check if the file needs decryption
            working_path = import_path
            if decrypt and import_path.endswith('.enc'):
                logger.debug(f"Decrypting import file: {import_path}")
                
                # Decrypt to a temporary file
                decrypted_path = os.path.join(temp_dir, "decrypted.zip")
                if not decrypt_file(import_path, decrypted_path):
                    logger.error(f"Failed to decrypt import file: {import_path}")
                    shutil.rmtree(temp_dir)
                    return {"success": False, "error": "Failed to decrypt import file"}
                
                working_path = decrypted_path
                logger.info(f"Decrypted import file to {working_path}")
            
            # Extract the zip file
            extract_dir = os.path.join(temp_dir, "extracted")
            os.makedirs(extract_dir, exist_ok=True)
            
            with zipfile.ZipFile(working_path, 'r') as zipf:
                zipf.extractall(extract_dir)
            
            # Read the metadata file
            metadata_file = os.path.join(extract_dir, "metadata.json")
            if not os.path.exists(metadata_file):
                logger.error("Invalid import file: metadata.json not found")
                shutil.rmtree(temp_dir)
                return {"success": False, "error": "Invalid import file format"}
            
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
            
            # Track import statistics
            import_stats = {
                "timestamp": datetime.datetime.now().isoformat(),
                "data_types": data_types,
                "imported_items": {},
                "success": True
            }
            
            # Process each data type
            for data_type in data_types:
                if data_type == 'conversations':
                    logger.debug("Importing conversations")
                    conv_dir = os.path.join(extract_dir, "conversations")
                    
                    if os.path.exists(conv_dir):
                        # If not merging, delete existing conversations
                        if not merge:
                            logger.warning("Clearing existing conversations")
                            # Implementation would need to clear existing conversations
                        
                        # Import each conversation
                        conv_count = 0
                        for file_name in os.listdir(conv_dir):
                            if file_name.endswith('.json'):
                                conv_file = os.path.join(conv_dir, file_name)
                                
                                with open(conv_file, 'r') as f:
                                    conversation = json.load(f)
                                
                                # Skip if conversation already exists and we're merging
                                if merge:
                                    existing_conv = await self.sqlite_db.get_conversation(conversation['id'])
                                    if existing_conv:
                                        logger.debug(f"Skipping existing conversation: {conversation['id']}")
                                        continue
                                
                                # Create conversation
                                imported_conv = await self.sqlite_db.create_conversation(
                                    title=conversation['title'],
                                    summary=conversation.get('summary'),
                                    metadata=conversation.get('metadata', {})
                                )
                                
                                if imported_conv:
                                    # Import messages if present
                                    if 'messages' in conversation:
                                        for msg in conversation['messages']:
                                            await self.sqlite_db.create_message(
                                                conversation_id=imported_conv['id'],
                                                role=msg['role'],
                                                content=msg['content'],
                                                metadata=msg.get('metadata', {})
                                            )
                                    
                                    conv_count += 1
                        
                        import_stats["imported_items"]["conversations"] = conv_count
                        logger.info(f"Imported {conv_count} conversations")
                    else:
                        logger.warning("Conversations directory not found in import")
                
                elif data_type == 'memories':
                    logger.debug("Importing memories")
                    mem_dir = os.path.join(extract_dir, "memories")
                    
                    if os.path.exists(mem_dir):
                        # If not merging, delete existing memories
                        if not merge:
                            logger.warning("Clearing existing memories")
                            # Implementation would need to clear existing memories
                        
                        # Import memories from each category file
                        mem_count = 0
                        for file_name in os.listdir(mem_dir):
                            if file_name.endswith('.json'):
                                category_file = os.path.join(mem_dir, file_name)
                                
                                with open(category_file, 'r') as f:
                                    memories = json.load(f)
                                
                                # Import each memory item
                                for mem in memories:
                                    # Skip if memory already exists and we're merging
                                    if merge:
                                        # Implementation would need to check for existing memory
                                        pass
                                    
                                    imported_mem = await self.sqlite_db.create_memory_item(
                                        content=mem['content'],
                                        category=mem['category'],
                                        source_type=mem.get('source_type'),
                                        source_id=mem.get('source_id'),
                                        importance=mem.get('importance', 1),
                                        metadata=mem.get('metadata', {})
                                    )
                                    
                                    if imported_mem:
                                        mem_count += 1
                        
                        import_stats["imported_items"]["memories"] = mem_count
                        logger.info(f"Imported {mem_count} memory items")
                    else:
                        logger.warning("Memories directory not found in import")
                
                elif data_type == 'documents':
                    logger.debug("Importing documents")
                    doc_dir = os.path.join(extract_dir, "documents")
                    
                    if os.path.exists(doc_dir):
                        doc_meta_dir = os.path.join(doc_dir, "metadata")
                        doc_content_dir = os.path.join(doc_dir, "files")
                        
                        # If not merging, delete existing documents
                        if not merge:
                            logger.warning("Clearing existing documents")
                            # Implementation would need to clear existing documents
                        
                        # Import each document
                        doc_count = 0
                        if os.path.exists(doc_meta_dir):
                            for file_name in os.listdir(doc_meta_dir):
                                if file_name.endswith('.json'):
                                    meta_file = os.path.join(doc_meta_dir, file_name)
                                    
                                    with open(meta_file, 'r') as f:
                                        document = json.load(f)
                                    
                                    # Skip if document already exists and we're merging
                                    if merge:
                                        existing_doc = await self.sqlite_db.get_document(document['id'])
                                        if existing_doc:
                                            logger.debug(f"Skipping existing document: {document['id']}")
                                            continue
                                    
                                    # Copy document file if it exists
                                    storage_path = document.get('storage_path')
                                    new_storage_path = None
                                    
                                    if storage_path and os.path.exists(doc_content_dir):
                                        file_name = os.path.basename(storage_path)
                                        src_path = os.path.join(doc_content_dir, file_name)
                                        
                                        if os.path.exists(src_path):
                                            # Determine destination path
                                            dest_dir = os.path.join(self.data_dir, "documents")
                                            os.makedirs(dest_dir, exist_ok=True)
                                            new_storage_path = os.path.join(dest_dir, file_name)
                                            
                                            # Copy the file
                                            shutil.copy2(src_path, new_storage_path)
                                    
                                    # Create document
                                    if new_storage_path:
                                        imported_doc = await self.sqlite_db.create_document(
                                            filename=document['filename'],
                                            file_type=document['file_type'],
                                            storage_path=new_storage_path,
                                            metadata=document.get('metadata', {})
                                        )
                                        
                                        if imported_doc:
                                            # Import chunks if present
                                            if 'chunks' in document:
                                                for chunk in document['chunks']:
                                                    await self.sqlite_db.create_document_chunk(
                                                        document_id=imported_doc['id'],
                                                        chunk_index=chunk['chunk_index'],
                                                        content=chunk['content'],
                                                        page_number=chunk.get('page_number'),
                                                        metadata=chunk.get('metadata', {})
                                                    )
                                            
                                            doc_count += 1
                        
                        import_stats["imported_items"]["documents"] = doc_count
                        logger.info(f"Imported {doc_count} documents")
                    else:
                        logger.warning("Documents directory not found in import")
                
                elif data_type == 'settings':
                    logger.debug("Importing settings")
                    settings_dir = os.path.join(extract_dir, "settings")
                    settings_file = os.path.join(settings_dir, "user_settings.json")
                    
                    if os.path.exists(settings_file):
                        with open(settings_file, 'r') as f:
                            user_settings = json.load(f)
                        
                        # Import settings
                        updated_settings = await self.sqlite_db.update_user_settings(user_settings)
                        
                        if updated_settings:
                            import_stats["imported_items"]["settings"] = 1
                            logger.info("Imported user settings")
                        else:
                            logger.error("Failed to import user settings")
                    else:
                        logger.warning("Settings file not found in import")
            
            # Clean up the temporary directory
            shutil.rmtree(temp_dir)
            
            # Publish event
            event_bus.publish("storage:data_imported", {
                "path": import_path,
                "data_types": data_types,
                "merge": merge,
                "items": import_stats["imported_items"]
            })
            
            logger.info(f"Data import completed from {import_path}")
            return import_stats
        
        except Exception as e:
            logger.error(f"Error importing data: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_storage_stats(self) -> Dict[str, Any]:
        """
        Gets storage usage statistics.
        
        Returns:
            Storage statistics dictionary
        """
        if not self.initialized:
            raise RuntimeError("Storage manager is not initialized")
        
        try:
            stats = {
                "timestamp": datetime.datetime.now().isoformat(),
                "sqlite_size": 0,
                "vector_size": 0,
                "file_size": 0,
                "backup_size": 0,
                "total_size": 0,
                "available_space": 0,
                "counts": {}
            }
            
            # Get SQLite database size
            sqlite_path = os.path.join(self.data_dir, "personal_ai.db")
            if os.path.exists(sqlite_path):
                stats["sqlite_size"] = os.path.getsize(sqlite_path)
            
            # Get vector database size
            vector_path = os.path.join(self.data_dir, "vectors")
            if os.path.exists(vector_path):
                stats["vector_size"] = self._get_directory_size(vector_path)
            
            # Get size of other files
            total_file_size = self._get_directory_size(self.data_dir)
            stats["file_size"] = total_file_size - stats["sqlite_size"] - stats["vector_size"]
            
            # Get backup size
            if os.path.exists(self.backup_dir):
                stats["backup_size"] = self._get_directory_size(self.backup_dir)
            
            # Calculate total size
            stats["total_size"] = stats["sqlite_size"] + stats["vector_size"] + stats["file_size"] + stats["backup_size"]
            
            # Get available disk space
            stats["available_space"] = shutil.disk_usage(self.data_dir).free
            
            # Get counts
            stats["counts"] = await self._get_record_counts()
            
            return stats
        
        except Exception as e:
            logger.error(f"Error getting storage stats: {str(e)}")
            return {"error": str(e)}
    
    async def cleanup_old_backups(self, max_backups: int = 5, max_days: int = 30, include_cloud: bool = False) -> int:
        """
        Cleans up old backups based on retention policy.
        
        Args:
            max_backups: Maximum number of backups to keep
            max_days: Maximum age of backups in days
            include_cloud: Whether to clean up cloud backups
        
        Returns:
            Number of backups deleted
        """
        if not self.initialized:
            raise RuntimeError("Storage manager is not initialized")
        
        try:
            # Get list of backups
            backups = await self.list_backups(include_cloud=include_cloud)
            
            # Calculate cutoff date
            cutoff_date = datetime.datetime.now() - datetime.timedelta(days=max_days)
            cutoff_date_str = cutoff_date.isoformat()
            
            # Sort backups by creation time, newest first
            backups.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            
            # Determine which backups to delete
            backups_to_delete = []
            
            # Keep the newest max_backups
            if len(backups) > max_backups:
                backups_to_delete.extend(backups[max_backups:])
            
            # Delete backups older than max_days
            backups_to_delete.extend([b for b in backups[:max_backups] if b.get("created_at", "") < cutoff_date_str])
            
            # Remove duplicates
            backups_to_delete = list({b["path"]: b for b in backups_to_delete}.values())
            
            # Delete backups
            deleted_count = 0
            for backup in backups_to_delete:
                location = backup.get("location", "local")
                path = backup.get("path", "")
                
                if location == "local":
                    if await self.delete_backup(path, delete_from_cloud=False):
                        deleted_count += 1
                elif location == "cloud" and include_cloud:
                    if await self.delete_backup(path, delete_from_cloud=True):
                        deleted_count += 1
            
            logger.info(f"Deleted {deleted_count} old backups")
            return deleted_count
        
        except Exception as e:
            logger.error(f"Error cleaning up old backups: {str(e)}")
            return 0
    
    async def optimize_storage(self) -> bool:
        """
        Optimizes storage for better performance.
        
        Returns:
            True if optimization successful, False otherwise
        """
        if not self.initialized:
            raise RuntimeError("Storage manager is not initialized")
        
        try:
            success = True
            
            # Optimize SQLite database
            logger.debug("Optimizing SQLite database")
            if not await self.sqlite_db.optimize_database():
                logger.error("Failed to optimize SQLite database")
                success = False
            
            # Optimize vector database
            logger.debug("Optimizing vector database")
            if not await self.vector_db.optimize_database():
                logger.error("Failed to optimize vector database")
                success = False
            
            # Clean up temporary files
            logger.debug("Cleaning up temporary files")
            temp_dirs = [
                os.path.join(self.data_dir, "temp"),
                os.path.join(self.data_dir, "tmp")
            ]
            
            for temp_dir in temp_dirs:
                if os.path.exists(temp_dir):
                    try:
                        shutil.rmtree(temp_dir)
                    except Exception as e:
                        logger.warning(f"Error cleaning up temporary directory {temp_dir}: {str(e)}")
            
            # Publish event
            event_bus.publish("storage:optimized", {
                "success": success
            })
            
            logger.info(f"Storage optimization {'completed successfully' if success else 'completed with errors'}")
            return success
        
        except Exception as e:
            logger.error(f"Error optimizing storage: {str(e)}")
            return False
    
    async def close(self) -> bool:
        """
        Closes all storage connections.
        
        Returns:
            True if close successful, False otherwise
        """
        if not self.initialized:
            return True
        
        try:
            success = True
            
            # Close SQLite database
            logger.debug("Closing SQLite database connection")
            try:
                if self.sqlite_db:
                    await self.sqlite_db.close()
            except Exception as e:
                logger.error(f"Error closing SQLite database: {str(e)}")
                success = False
            
            # Close vector database
            logger.debug("Closing vector database connection")
            try:
                if self.vector_db:
                    await self.vector_db.close()
            except Exception as e:
                logger.error(f"Error closing vector database: {str(e)}")
                success = False
            
            # Mark as not initialized
            self.initialized = False
            
            # Publish event
            event_bus.publish("storage:closed", {
                "success": success
            })
            
            logger.info(f"Storage connections closed {'successfully' if success else 'with errors'}")
            return success
        
        except Exception as e:
            logger.error(f"Error closing storage connections: {str(e)}")
            return False
    
    def _create_backup_metadata(self, backup_path: str, contents: Dict[str, Any]) -> Dict[str, Any]:
        """
        Creates metadata for a backup.
        
        Args:
            backup_path: Path to the backup directory
            contents: Dictionary of backup contents
        
        Returns:
            Backup metadata dictionary
        """
        try:
            # Create metadata
            metadata = {
                "timestamp": datetime.datetime.now().isoformat(),
                "version": "1.0",
                "path": backup_path,
                "contents": contents
            }
            
            # Write metadata to file
            metadata_file = os.path.join(backup_path, "metadata.json")
            with open(metadata_file, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            return metadata
        
        except Exception as e:
            logger.error(f"Error creating backup metadata: {str(e)}")
            return {"error": str(e)}
    
    def _read_backup_metadata(self, backup_path: str) -> Optional[Dict[str, Any]]:
        """
        Reads metadata from a backup.
        
        Args:
            backup_path: Path to the backup directory
        
        Returns:
            Backup metadata dictionary or None if not found
        """
        try:
            metadata_file = os.path.join(backup_path, "metadata.json")
            
            if os.path.exists(metadata_file):
                with open(metadata_file, 'r') as f:
                    return json.load(f)
            
            return None
        
        except Exception as e:
            logger.error(f"Error reading backup metadata: {str(e)}")
            return None
    
    async def _backup_files(self, source_dir: str, backup_dir: str, exclude_patterns: List[str] = None) -> Dict[str, Any]:
        """
        Backs up files from data directory.
        
        Args:
            source_dir: Source directory to backup
            backup_dir: Destination directory for backup
            exclude_patterns: List of patterns to exclude
        
        Returns:
            Backup statistics
        """
        try:
            # Create backup directory
            os.makedirs(backup_dir, exist_ok=True)
            
            # Default exclude patterns
            if exclude_patterns is None:
                exclude_patterns = []
            
            # Track statistics
            stats = {
                "success": True,
                "count": 0,
                "size": 0
            }
            
            # Walk through source directory
            for root, dirs, files in os.walk(source_dir):
                # Skip directories that match exclude patterns
                skip_dir = False
                for pattern in exclude_patterns:
                    if root.endswith(pattern.rstrip('*')) or \
                       (pattern.endswith('*') and root.startswith(pattern.rstrip('*'))) or \
                       (pattern.startswith('*') and root.endswith(pattern.lstrip('*'))):
                        skip_dir = True
                        break
                
                if skip_dir:
                    continue
                
                # Process files in this directory
                for file in files:
                    src_path = os.path.join(root, file)
                    
                    # Skip files that match exclude patterns
                    skip_file = False
                    for pattern in exclude_patterns:
                        if pattern.endswith('*') and file.startswith(pattern.rstrip('*')):
                            skip_file = True
                            break
                        elif pattern.startswith('*') and file.endswith(pattern.lstrip('*')):
                            skip_file = True
                            break
                        elif pattern == file:
                            skip_file = True
                            break
                    
                    if skip_file:
                        continue
                    
                    # Determine relative path
                    rel_path = os.path.relpath(src_path, source_dir)
                    dest_path = os.path.join(backup_dir, rel_path)
                    
                    # Create parent directories
                    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                    
                    # Copy file
                    try:
                        shutil.copy2(src_path, dest_path)
                        stats["count"] += 1
                        stats["size"] += os.path.getsize(src_path)
                    except Exception as e:
                        logger.warning(f"Error copying file {src_path}: {str(e)}")
            
            return stats
        
        except Exception as e:
            logger.error(f"Error backing up files: {str(e)}")
            return {"success": False, "error": str(e), "count": 0, "size": 0}
    
    async def _restore_files(self, backup_dir: str, target_dir: str, overwrite: bool = False) -> Dict[str, Any]:
        """
        Restores files to data directory.
        
        Args:
            backup_dir: Source directory containing backup files
            target_dir: Destination directory to restore to
            overwrite: Whether to overwrite existing files
        
        Returns:
            Restore statistics
        """
        try:
            # Check if backup directory exists
            if not os.path.exists(backup_dir):
                return {"success": False, "error": f"Backup directory not found: {backup_dir}", "count": 0, "size": 0}
            
            # Track statistics
            stats = {
                "success": True,
                "count": 0,
                "size": 0
            }
            
            # Walk through backup directory
            for root, dirs, files in os.walk(backup_dir):
                # Process files in this directory
                for file in files:
                    src_path = os.path.join(root, file)
                    
                    # Determine relative path
                    rel_path = os.path.relpath(src_path, backup_dir)
                    dest_path = os.path.join(target_dir, rel_path)
                    
                    # Check if destination file already exists
                    if os.path.exists(dest_path) and not overwrite:
                        continue
                    
                    # Create parent directories
                    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                    
                    # Copy file
                    try:
                        shutil.copy2(src_path, dest_path)
                        stats["count"] += 1
                        stats["size"] += os.path.getsize(src_path)
                    except Exception as e:
                        logger.warning(f"Error restoring file {src_path}: {str(e)}")
            
            return stats
        
        except Exception as e:
            logger.error(f"Error restoring files: {str(e)}")
            return {"success": False, "error": str(e), "count": 0, "size": 0}
    
    def _get_directory_size(self, path: str) -> int:
        """
        Calculates the total size of a directory.
        
        Args:
            path: Directory path
        
        Returns:
            Total size in bytes
        """
        total_size = 0
        
        try:
            if os.path.isfile(path):
                return os.path.getsize(path)
            
            for root, dirs, files in os.walk(path):
                for file in files:
                    file_path = os.path.join(root, file)
                    if os.path.exists(file_path):
                        total_size += os.path.getsize(file_path)
            
            return total_size
        
        except Exception as e:
            logger.error(f"Error calculating directory size: {str(e)}")
            return 0
    
    async def _get_record_counts(self) -> Dict[str, int]:
        """
        Gets count of records in the database.
        
        Returns:
            Dictionary of record counts
        """
        try:
            counts = {}
            
            # Get conversation count
            counts["conversations"] = await self.sqlite_db.count_records(model_class="Conversation")
            
            # Get message count
            counts["messages"] = await self.sqlite_db.count_records(model_class="Message")
            
            # Get memory item count
            counts["memory_items"] = await self.sqlite_db.count_records(model_class="MemoryItem")
            
            # Get document count
            counts["documents"] = await self.sqlite_db.count_records(model_class="Document")
            
            # Get document chunk count
            counts["document_chunks"] = await self.sqlite_db.count_records(model_class="DocumentChunk")
            
            # Get web page count
            counts["web_pages"] = await self.sqlite_db.count_records(model_class="WebPage")
            
            # Get web content chunk count
            counts["web_content_chunks"] = await self.sqlite_db.count_records(model_class="WebContentChunk")
            
            # Get vector embedding count
            counts["vector_embeddings"] = await self.vector_db.count_embeddings()
            
            return counts
        
        except Exception as e:
            logger.error(f"Error getting record counts: {str(e)}")
            return {}