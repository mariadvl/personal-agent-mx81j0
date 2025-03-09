import os
import base64
import hashlib
import logging
import getpass
import keyring
from cryptography.fernet import Fernet  # v41.0.0
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC  # v41.0.0
from cryptography.hazmat.primitives import hashes  # v41.0.0
from cryptography.hazmat.primitives.ciphers.aead import AESGCM  # v41.0.0

# Configure logger
logger = logging.getLogger(__name__)

# Constants for key management
KEY_SERVICE_NAME = "personal_ai_agent"
KEY_USERNAME = "encryption_master_key"
SALT_SIZE = 16
KEY_SIZE = 32  # 256 bits
ITERATIONS = 100000
NONCE_SIZE = 12


def get_master_key(passphrase=None):
    """
    Retrieves or generates the master encryption key from the system keyring.
    
    Args:
        passphrase (str, optional): Optional passphrase to derive the key from.
            If provided, a new key will be generated.
    
    Returns:
        bytes: Master encryption key
    
    Raises:
        Exception: If there's an error retrieving or generating the key
    """
    try:
        # Try to retrieve existing key from keyring
        stored_key = keyring.get_password(KEY_SERVICE_NAME, KEY_USERNAME)
        
        # If key exists and no passphrase provided, return the existing key
        if stored_key and not passphrase:
            return base64.b64decode(stored_key)
        
        # Generate a new key
        if passphrase:
            # Derive key from passphrase
            salt = generate_salt(SALT_SIZE)
            key = derive_key_from_password(passphrase, salt, ITERATIONS, KEY_SIZE)
        else:
            # Generate random key
            key = os.urandom(KEY_SIZE)
        
        # Store the key in the system keyring
        keyring.set_password(KEY_SERVICE_NAME, KEY_USERNAME, base64.b64encode(key).decode('utf-8'))
        
        return key
    except Exception as e:
        logger.error(f"Error in get_master_key: {str(e)}")
        raise


def derive_key_from_password(password, salt, iterations=ITERATIONS, key_length=KEY_SIZE):
    """
    Derives an encryption key from a password using PBKDF2.
    
    Args:
        password (str): The password to derive key from
        salt (bytes): Random salt for key derivation
        iterations (int, optional): Number of iterations for PBKDF2
        key_length (int, optional): Length of the output key in bytes
    
    Returns:
        bytes: Derived key
    
    Raises:
        Exception: If there's an error in key derivation
    """
    try:
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=key_length,
            salt=salt,
            iterations=iterations
        )
        
        key = kdf.derive(password.encode('utf-8'))
        return key
    except Exception as e:
        logger.error(f"Error in derive_key_from_password: {str(e)}")
        raise


def generate_salt(size=SALT_SIZE):
    """
    Generates a random salt for key derivation.
    
    Args:
        size (int, optional): Size of the salt in bytes
    
    Returns:
        bytes: Random salt
    
    Raises:
        Exception: If there's an error generating the salt
    """
    try:
        return os.urandom(size)
    except Exception as e:
        logger.error(f"Error in generate_salt: {str(e)}")
        raise


def encrypt_value(value, key=None):
    """
    Encrypts a value using AES-GCM with the master key.
    
    Args:
        value (bytes): The value to encrypt
        key (bytes, optional): Encryption key. If not provided, the master key will be used.
    
    Returns:
        bytes: Encrypted value with nonce prepended
    
    Raises:
        Exception: If there's an error in encryption
    """
    try:
        if key is None:
            key = get_master_key()
            
        # Generate a random nonce
        nonce = os.urandom(NONCE_SIZE)
        
        # Create AES-GCM cipher
        aesgcm = AESGCM(key)
        
        # Encrypt the value
        encrypted_data = aesgcm.encrypt(nonce, value, None)
        
        # Combine nonce and encrypted data
        return nonce + encrypted_data
    except Exception as e:
        logger.error(f"Error in encrypt_value: {str(e)}")
        raise


def decrypt_value(encrypted_value, key=None):
    """
    Decrypts a value using AES-GCM with the master key.
    
    Args:
        encrypted_value (bytes): The encrypted value with nonce prepended
        key (bytes, optional): Decryption key. If not provided, the master key will be used.
    
    Returns:
        bytes: Decrypted value
    
    Raises:
        Exception: If there's an error in decryption
    """
    try:
        if key is None:
            key = get_master_key()
            
        # Extract nonce and encrypted data
        nonce = encrypted_value[:NONCE_SIZE]
        encrypted_data = encrypted_value[NONCE_SIZE:]
        
        # Create AES-GCM cipher
        aesgcm = AESGCM(key)
        
        # Decrypt the value
        return aesgcm.decrypt(nonce, encrypted_data, None)
    except Exception as e:
        logger.error(f"Error in decrypt_value: {str(e)}")
        raise


def encrypt_file(input_path, output_path, key=None):
    """
    Encrypts a file using AES-GCM with the master key.
    
    Args:
        input_path (str): Path to the file to encrypt
        output_path (str): Path where the encrypted file will be saved
        key (bytes, optional): Encryption key. If not provided, the master key will be used.
    
    Returns:
        bool: True if encryption successful, False otherwise
    
    Raises:
        Exception: If there's an error in file encryption
    """
    try:
        if key is None:
            key = get_master_key()
            
        # Generate a random nonce
        nonce = os.urandom(NONCE_SIZE)
        
        # Create AES-GCM cipher
        aesgcm = AESGCM(key)
        
        # Read input file
        with open(input_path, 'rb') as f:
            data = f.read()
        
        # Encrypt the data
        encrypted_data = aesgcm.encrypt(nonce, data, None)
        
        # Write nonce and encrypted data to output file
        with open(output_path, 'wb') as f:
            f.write(nonce + encrypted_data)
            
        return True
    except Exception as e:
        logger.error(f"Error in encrypt_file: {str(e)}")
        return False


def decrypt_file(input_path, output_path, key=None):
    """
    Decrypts a file using AES-GCM with the master key.
    
    Args:
        input_path (str): Path to the encrypted file
        output_path (str): Path where the decrypted file will be saved
        key (bytes, optional): Decryption key. If not provided, the master key will be used.
    
    Returns:
        bool: True if decryption successful, False otherwise
    
    Raises:
        Exception: If there's an error in file decryption
    """
    try:
        if key is None:
            key = get_master_key()
            
        # Read encrypted file
        with open(input_path, 'rb') as f:
            encrypted_data = f.read()
            
        # Extract nonce and encrypted data
        nonce = encrypted_data[:NONCE_SIZE]
        data = encrypted_data[NONCE_SIZE:]
        
        # Create AES-GCM cipher
        aesgcm = AESGCM(key)
        
        # Decrypt the data
        decrypted_data = aesgcm.decrypt(nonce, data, None)
        
        # Write decrypted data to output file
        with open(output_path, 'wb') as f:
            f.write(decrypted_data)
            
        return True
    except Exception as e:
        logger.error(f"Error in decrypt_file: {str(e)}")
        return False


def create_key_file(key_path, password=None):
    """
    Creates an encryption key file with an optional password.
    
    Args:
        key_path (str): Path where the key file will be saved
        password (str, optional): Optional password to protect the key
    
    Returns:
        bytes: Generated key
    
    Raises:
        Exception: If there's an error creating the key file
    """
    try:
        if password:
            # Generate salt and derive key from password
            salt = generate_salt(SALT_SIZE)
            key = derive_key_from_password(password, salt, ITERATIONS, KEY_SIZE)
            
            # Write salt and key to file
            with open(key_path, 'wb') as f:
                f.write(salt + key)
        else:
            # Generate random key
            key = os.urandom(KEY_SIZE)
            
            # Write key to file
            with open(key_path, 'wb') as f:
                f.write(key)
                
        return key
    except Exception as e:
        logger.error(f"Error in create_key_file: {str(e)}")
        raise


def load_key_from_file(key_path, password=None):
    """
    Loads an encryption key from a key file.
    
    Args:
        key_path (str): Path to the key file
        password (str, optional): Password to derive the key if the key file is password-protected
    
    Returns:
        bytes: Loaded key
    
    Raises:
        Exception: If there's an error loading the key file
    """
    try:
        with open(key_path, 'rb') as f:
            file_data = f.read()
            
        if password:
            # Extract salt and derive key
            salt = file_data[:SALT_SIZE]
            key = derive_key_from_password(password, salt, ITERATIONS, KEY_SIZE)
            return key
        else:
            # Use the file content as the key
            return file_data
    except Exception as e:
        logger.error(f"Error in load_key_from_file: {str(e)}")
        raise


def generate_key(key_size=KEY_SIZE):
    """
    Generates a random encryption key.
    
    Args:
        key_size (int, optional): Size of the key in bytes
    
    Returns:
        bytes: Random key
    
    Raises:
        Exception: If there's an error generating the key
    """
    try:
        return os.urandom(key_size)
    except Exception as e:
        logger.error(f"Error in generate_key: {str(e)}")
        raise


def encrypt_string(plaintext, key=None):
    """
    Encrypts a string using AES-GCM with the master key.
    
    Args:
        plaintext (str): The string to encrypt
        key (bytes, optional): Encryption key. If not provided, the master key will be used.
    
    Returns:
        str: Base64-encoded encrypted string
    
    Raises:
        Exception: If there's an error in string encryption
    """
    try:
        # Convert plaintext to bytes
        plaintext_bytes = plaintext.encode('utf-8')
        
        # Encrypt the bytes
        encrypted_bytes = encrypt_value(plaintext_bytes, key)
        
        # Convert to base64 for string representation
        return base64.b64encode(encrypted_bytes).decode('utf-8')
    except Exception as e:
        logger.error(f"Error in encrypt_string: {str(e)}")
        raise


def decrypt_string(encrypted_text, key=None):
    """
    Decrypts a base64-encoded encrypted string using AES-GCM with the master key.
    
    Args:
        encrypted_text (str): The base64-encoded encrypted string
        key (bytes, optional): Decryption key. If not provided, the master key will be used.
    
    Returns:
        str: Decrypted string
    
    Raises:
        Exception: If there's an error in string decryption
    """
    try:
        # Convert base64 string to bytes
        encrypted_bytes = base64.b64decode(encrypted_text)
        
        # Decrypt the bytes
        decrypted_bytes = decrypt_value(encrypted_bytes, key)
        
        # Convert bytes to string
        return decrypted_bytes.decode('utf-8')
    except Exception as e:
        logger.error(f"Error in decrypt_string: {str(e)}")
        raise


def is_encrypted(file_path):
    """
    Checks if a file is encrypted by this module.
    
    Args:
        file_path (str): Path to the file to check
    
    Returns:
        bool: True if file appears to be encrypted, False otherwise
    
    Raises:
        Exception: If there's an error checking the file
    """
    try:
        # Check if file exists
        if not os.path.isfile(file_path):
            return False
            
        # Read the first few bytes of the file
        with open(file_path, 'rb') as f:
            header = f.read(NONCE_SIZE + 16)  # nonce + minimal ciphertext
            
        # Check if the file is large enough to potentially be encrypted
        if len(header) < NONCE_SIZE + 16:
            return False
            
        # This is a heuristic check since we don't have a specific signature
        # We check if the file starts with what appears to be a nonce
        # followed by encrypted data (which should have high entropy)
        return len(header) >= NONCE_SIZE + 16
    except Exception as e:
        logger.error(f"Error in is_encrypted: {str(e)}")
        return False