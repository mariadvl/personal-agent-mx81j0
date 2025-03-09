import os
import logging
import tempfile
import boto3
from botocore.exceptions import ClientError

from ..config.settings import Settings
from ..utils.encryption import encrypt_file, decrypt_file, get_master_key

# Configure logger
logger = logging.getLogger(__name__)

class CloudStorageManager:
    """
    Manages cloud storage operations for backup and synchronization.
    
    This class handles connecting to cloud storage providers (primarily S3),
    and provides methods for secure file upload, download, and management.
    All data is encrypted before being uploaded to cloud storage to ensure
    end-to-end encryption and user privacy.
    """
    
    def __init__(self, settings):
        """
        Initializes the cloud storage manager with settings.
        
        Args:
            settings (Settings): Application settings instance
        """
        self._settings = settings
        self._initialized = False
        self._provider = None
        self._client = None
        self._bucket = None
        self._encryption_key = None
    
    def initialize(self):
        """
        Initializes the cloud storage client based on configuration.
        
        Returns:
            bool: True if initialization successful, False otherwise
        """
        # Check if cloud backup is enabled
        if not self._settings.get('storage.backup_enabled', False):
            logger.info("Cloud backup is not enabled in settings")
            return False
        
        # Get cloud storage provider
        provider = self._settings.get('storage.provider', 's3').lower()
        self._provider = provider
        
        # Initialize appropriate client based on provider
        if provider == 's3':
            return self._initialize_s3_client()
        else:
            logger.error(f"Unsupported cloud storage provider: {provider}")
            return False
    
    def is_enabled(self):
        """
        Checks if cloud backup is enabled and initialized.
        
        Returns:
            bool: True if cloud backup is enabled and initialized
        """
        return (self._settings.get('storage.backup_enabled', False) and 
                self._initialized)
    
    def backup_file(self, local_path, remote_path, encrypt=True):
        """
        Uploads a file to cloud storage with encryption.
        
        Args:
            local_path (str): Path to the local file
            remote_path (str): Path in cloud storage
            encrypt (bool): Whether to encrypt the file before upload
        
        Returns:
            bool: True if upload successful, False otherwise
        """
        if not self.is_enabled():
            logger.error("Cloud storage not enabled or initialized")
            return False
        
        try:
            temp_file = None
            upload_path = local_path
            
            # Encrypt file if requested
            if encrypt:
                temp_file = self._encrypt_file_for_upload(local_path)
                if not temp_file:
                    logger.error(f"Failed to encrypt file: {local_path}")
                    return False
                upload_path = temp_file
            
            # Upload file based on provider
            if self._provider == 's3':
                self._client.upload_file(
                    Filename=upload_path,
                    Bucket=self._bucket,
                    Key=remote_path
                )
            
            # Clean up temporary file if created
            if temp_file and os.path.exists(temp_file):
                os.remove(temp_file)
            
            logger.info(f"Successfully uploaded file to {remote_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error uploading file to cloud storage: {str(e)}")
            # Clean up temporary file if created
            if temp_file and os.path.exists(temp_file):
                os.remove(temp_file)
            return False
    
    def restore_file(self, remote_path, local_path, decrypt=True):
        """
        Downloads a file from cloud storage with decryption.
        
        Args:
            remote_path (str): Path in cloud storage
            local_path (str): Path to save the local file
            decrypt (bool): Whether to decrypt the file after download
        
        Returns:
            bool: True if download successful, False otherwise
        """
        if not self.is_enabled():
            logger.error("Cloud storage not enabled or initialized")
            return False
        
        try:
            temp_file = None
            download_path = local_path
            
            # Create temporary file for decryption if needed
            if decrypt:
                fd, temp_file = tempfile.mkstemp()
                os.close(fd)
                download_path = temp_file
            
            # Download file based on provider
            if self._provider == 's3':
                self._client.download_file(
                    Bucket=self._bucket,
                    Key=remote_path,
                    Filename=download_path
                )
            
            # Decrypt file if requested
            if decrypt:
                if not self._decrypt_file_after_download(download_path, local_path):
                    logger.error(f"Failed to decrypt file: {remote_path}")
                    if os.path.exists(temp_file):
                        os.remove(temp_file)
                    return False
                
                # Clean up temporary file after decryption
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            
            logger.info(f"Successfully downloaded file from {remote_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error downloading file from cloud storage: {str(e)}")
            # Clean up temporary file if created
            if temp_file and os.path.exists(temp_file):
                os.remove(temp_file)
            return False
    
    def list_files(self, prefix=''):
        """
        Lists files in cloud storage with optional prefix filter.
        
        Args:
            prefix (str): Optional prefix to filter results
        
        Returns:
            list: List of file paths in cloud storage
        """
        if not self.is_enabled():
            logger.error("Cloud storage not enabled or initialized")
            return []
        
        try:
            files = []
            
            # List files based on provider
            if self._provider == 's3':
                paginator = self._client.get_paginator('list_objects_v2')
                page_iterator = paginator.paginate(
                    Bucket=self._bucket,
                    Prefix=prefix
                )
                
                # Extract file paths from all pages
                for page in page_iterator:
                    if 'Contents' in page:
                        for obj in page['Contents']:
                            files.append(obj['Key'])
                
            return files
            
        except Exception as e:
            logger.error(f"Error listing files in cloud storage: {str(e)}")
            return []
    
    def delete_file(self, remote_path):
        """
        Deletes a file from cloud storage.
        
        Args:
            remote_path (str): Path in cloud storage
        
        Returns:
            bool: True if deletion successful, False otherwise
        """
        if not self.is_enabled():
            logger.error("Cloud storage not enabled or initialized")
            return False
        
        try:
            # Delete file based on provider
            if self._provider == 's3':
                self._client.delete_object(
                    Bucket=self._bucket,
                    Key=remote_path
                )
            
            logger.info(f"Successfully deleted file: {remote_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting file from cloud storage: {str(e)}")
            return False
    
    def file_exists(self, remote_path):
        """
        Checks if a file exists in cloud storage.
        
        Args:
            remote_path (str): Path in cloud storage
        
        Returns:
            bool: True if file exists, False otherwise
        """
        if not self.is_enabled():
            logger.error("Cloud storage not enabled or initialized")
            return False
        
        try:
            # Check if file exists based on provider
            if self._provider == 's3':
                self._client.head_object(
                    Bucket=self._bucket,
                    Key=remote_path
                )
                return True
            
            return False
            
        except ClientError as e:
            # File does not exist
            if e.response['Error']['Code'] == '404':
                return False
            # Other error
            logger.error(f"Error checking if file exists: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Error checking if file exists: {str(e)}")
            return False
    
    def get_file_metadata(self, remote_path):
        """
        Gets metadata for a file in cloud storage.
        
        Args:
            remote_path (str): Path in cloud storage
        
        Returns:
            dict: File metadata or None if file not found
        """
        if not self.is_enabled():
            logger.error("Cloud storage not enabled or initialized")
            return None
        
        try:
            # Get file metadata based on provider
            if self._provider == 's3':
                response = self._client.head_object(
                    Bucket=self._bucket,
                    Key=remote_path
                )
                
                # Extract relevant metadata
                metadata = {
                    'size': response.get('ContentLength', 0),
                    'last_modified': response.get('LastModified'),
                    'etag': response.get('ETag', '').strip('"'),
                    'content_type': response.get('ContentType', ''),
                    'metadata': response.get('Metadata', {})
                }
                
                return metadata
            
            return None
            
        except ClientError as e:
            # File does not exist
            if e.response['Error']['Code'] == '404':
                return None
            # Other error
            logger.error(f"Error getting file metadata: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error getting file metadata: {str(e)}")
            return None
    
    def create_presigned_url(self, remote_path, expiration=3600):
        """
        Creates a presigned URL for temporary file access.
        
        Args:
            remote_path (str): Path in cloud storage
            expiration (int): URL expiration time in seconds
        
        Returns:
            str: Presigned URL or None if error
        """
        if not self.is_enabled():
            logger.error("Cloud storage not enabled or initialized")
            return None
        
        try:
            # Create presigned URL based on provider
            if self._provider == 's3':
                url = self._client.generate_presigned_url(
                    'get_object',
                    Params={
                        'Bucket': self._bucket,
                        'Key': remote_path
                    },
                    ExpiresIn=expiration
                )
                return url
            
            return None
            
        except Exception as e:
            logger.error(f"Error creating presigned URL: {str(e)}")
            return None
    
    def _initialize_s3_client(self):
        """
        Initializes the S3 client with credentials from settings.
        
        Returns:
            bool: True if initialization successful, False otherwise
        """
        try:
            # Get S3 configuration
            aws_access_key = self._settings.get_secret('aws_access_key')
            aws_secret_key = self._settings.get_secret('aws_secret_key')
            region = self._settings.get('storage.s3.region', 'us-east-1')
            self._bucket = self._settings.get('storage.s3.bucket')
            
            # Check if required settings are present
            if not aws_access_key or not aws_secret_key or not self._bucket:
                logger.error("Missing required S3 configuration")
                return False
            
            # Create boto3 client
            self._client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=region
            )
            
            # Verify connection by listing buckets
            self._client.list_buckets()
            
            # Set provider and initialized flag
            self._provider = 's3'
            self._initialized = True
            
            # Get encryption key
            self._encryption_key = get_master_key()
            
            logger.info("Successfully initialized S3 client")
            return True
            
        except Exception as e:
            logger.error(f"Error initializing S3 client: {str(e)}")
            self._initialized = False
            self._client = None
            return False
    
    def _encrypt_file_for_upload(self, local_path):
        """
        Encrypts a file before uploading to cloud storage.
        
        Args:
            local_path (str): Path to the local file
        
        Returns:
            str: Path to encrypted temporary file or None if encryption failed
        """
        try:
            # Create temporary file for encrypted content
            fd, temp_file = tempfile.mkstemp()
            os.close(fd)
            
            # Encrypt the file
            if encrypt_file(local_path, temp_file, self._encryption_key):
                return temp_file
            else:
                # Clean up if encryption failed
                os.remove(temp_file)
                return None
            
        except Exception as e:
            logger.error(f"Error encrypting file for upload: {str(e)}")
            return None
    
    def _decrypt_file_after_download(self, encrypted_path, output_path):
        """
        Decrypts a file after downloading from cloud storage.
        
        Args:
            encrypted_path (str): Path to the encrypted file
            output_path (str): Path to save the decrypted file
        
        Returns:
            bool: True if decryption successful, False otherwise
        """
        try:
            # Decrypt the file
            return decrypt_file(encrypted_path, output_path, self._encryption_key)
            
        except Exception as e:
            logger.error(f"Error decrypting downloaded file: {str(e)}")
            return False