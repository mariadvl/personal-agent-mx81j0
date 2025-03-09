import os
import json
import yaml
import logging
from pathlib import Path

from ..utils.encryption import encrypt_value, decrypt_value, get_master_key

# Configure logger
logger = logging.getLogger(__name__)

def _get_default_config_dir():
    """
    Determines the default configuration directory based on the platform.
    
    Returns:
        str: Path to the default configuration directory
    """
    if os.name == 'nt':  # Windows
        return os.path.join(os.environ['APPDATA'], 'PersonalAI')
    else:  # macOS/Linux
        return os.path.join(os.path.expanduser('~'), '.personalai')

class Settings:
    """
    Manages application settings with secure storage of sensitive values.
    """
    
    def __init__(self, config_dir=None):
        """
        Initializes the Settings object with the specified configuration directory.
        
        Args:
            config_dir (str, optional): Path to the configuration directory.
                If not provided, the default platform-specific path will be used.
        """
        self.config_dir = config_dir or _get_default_config_dir()
        self.config_file = Path(self.config_dir) / "config.json"
        self.secrets_file = Path(self.config_dir) / "secrets.enc"
        self.config = self._load_config()
        self.secrets = self._load_secrets()
    
    def _load_config(self):
        """
        Loads or creates the configuration file.
        
        Returns:
            dict: Configuration dictionary
        """
        # Create config directory if it doesn't exist
        os.makedirs(self.config_dir, exist_ok=True)
        
        # Load existing config if it exists
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading config file: {str(e)}")
                # Fall through to loading default config
        
        # Load default config
        default_config_path = Path(__file__).parent / "default_config.yaml"
        try:
            with open(default_config_path, 'r') as f:
                default_config = yaml.safe_load(f)
                
            # Save default config
            with open(self.config_file, 'w') as f:
                json.dump(default_config, f, indent=2)
                
            return default_config
        except Exception as e:
            logger.error(f"Error loading default config: {str(e)}")
            # Return minimal default config if file cannot be loaded
            return {
                "general": {
                    "app_name": "Personal AI Agent",
                    "version": "1.0.0",
                    "language": "en"
                },
                "privacy": {
                    "local_storage_only": True,
                    "analytics_enabled": False,
                    "error_reporting": False
                }
            }
    
    def _save_config(self):
        """
        Saves the configuration to file.
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            with open(self.config_file, 'w') as f:
                json.dump(self.config, f, indent=2)
            return True
        except Exception as e:
            logger.error(f"Error saving config file: {str(e)}")
            return False
    
    def _load_secrets(self):
        """
        Loads encrypted secrets from file or initializes empty dict.
        
        Returns:
            dict: Decrypted secrets dictionary
        """
        if os.path.exists(self.secrets_file):
            try:
                with open(self.secrets_file, 'rb') as f:
                    encrypted_data = f.read()
                return json.loads(decrypt_value(encrypted_data).decode('utf-8'))
            except Exception as e:
                logger.error(f"Error loading secrets file: {str(e)}")
                return {}
        return {}
    
    def _save_secrets(self):
        """
        Encrypts and saves secrets to file.
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            encrypted_data = encrypt_value(json.dumps(self.secrets).encode('utf-8'))
            with open(self.secrets_file, 'wb') as f:
                f.write(encrypted_data)
            return True
        except Exception as e:
            logger.error(f"Error saving secrets file: {str(e)}")
            return False
    
    def get(self, key, default=None):
        """
        Gets a configuration value by key with optional default.
        
        Args:
            key (str): Dot-notation key for the configuration value
            default (any, optional): Default value if key is not found
        
        Returns:
            any: Configuration value or default if not found
        """
        keys = key.split('.')
        value = self.config
        
        for k in keys:
            if isinstance(value, dict) and k in value:
                value = value[k]
            else:
                return default
        
        return value
    
    def set(self, key, value):
        """
        Sets a configuration value by key.
        
        Args:
            key (str): Dot-notation key for the configuration value
            value (any): Value to set
        
        Returns:
            bool: True if successful, False otherwise
        """
        keys = key.split('.')
        config = self.config
        
        # Navigate to the nested dictionary
        for k in keys[:-1]:
            if k not in config:
                config[k] = {}
            elif not isinstance(config[k], dict):
                config[k] = {}
            config = config[k]
        
        # Set the value
        config[keys[-1]] = value
        
        # Save the updated config
        return self._save_config()
    
    def get_secret(self, key, default=None):
        """
        Gets a secret value by key with optional default.
        
        Args:
            key (str): Key for the secret value
            default (any, optional): Default value if key is not found
        
        Returns:
            any: Secret value or default if not found
        """
        return self.secrets.get(key, default)
    
    def set_secret(self, key, value):
        """
        Sets a secret value by key.
        
        Args:
            key (str): Key for the secret value
            value (any): Value to set
        
        Returns:
            bool: True if successful, False otherwise
        """
        self.secrets[key] = value
        return self._save_secrets()
    
    def delete_secret(self, key):
        """
        Deletes a secret value by key.
        
        Args:
            key (str): Key for the secret value to delete
        
        Returns:
            bool: True if successful, False otherwise
        """
        if key in self.secrets:
            del self.secrets[key]
            return self._save_secrets()
        return False
    
    def reset_to_defaults(self):
        """
        Resets all settings to default values.
        
        Returns:
            bool: True if successful, False otherwise
        """
        # Load default config
        default_config_path = Path(__file__).parent / "default_config.yaml"
        try:
            with open(default_config_path, 'r') as f:
                self.config = yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Error loading default config: {str(e)}")
            return False
        
        # Clear secrets
        self.secrets = {}
        
        # Save changes
        config_success = self._save_config()
        secrets_success = self._save_secrets()
        
        return config_success and secrets_success
    
    def export_config(self, export_path):
        """
        Exports configuration to a file (excluding secrets).
        
        Args:
            export_path (str): Path where the configuration will be exported
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Create a sanitized copy of the config (no sensitive data)
            export_config = json.loads(json.dumps(self.config))
            
            # Remove any potentially sensitive fields
            if "api_keys" in export_config:
                del export_config["api_keys"]
            
            with open(export_path, 'w') as f:
                json.dump(export_config, f, indent=2)
            
            return True
        except Exception as e:
            logger.error(f"Error exporting config: {str(e)}")
            return False
    
    def import_config(self, import_path):
        """
        Imports configuration from a file.
        
        Args:
            import_path (str): Path to the configuration file to import
        
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            with open(import_path, 'r') as f:
                imported_config = json.load(f)
            
            # Merge imported config with current config
            self._merge_config(self.config, imported_config)
            
            # Save the updated config
            return self._save_config()
        except Exception as e:
            logger.error(f"Error importing config: {str(e)}")
            return False
    
    def _merge_config(self, target, source):
        """
        Recursively merges source dictionary into target dictionary.
        
        Args:
            target (dict): Target dictionary to merge into
            source (dict): Source dictionary to merge from
        """
        for key, value in source.items():
            if isinstance(value, dict) and key in target and isinstance(target[key], dict):
                self._merge_config(target[key], value)
            else:
                target[key] = value