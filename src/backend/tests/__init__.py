"""
Initialization file for the test package that defines common utilities, constants, and configurations
for testing the Personal AI Agent backend. This file provides the foundation for both unit and 
integration tests.
"""

import os
import tempfile
import shutil
import json
from pathlib import Path
import pytest

# Define test directory constants
TEST_ROOT_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
TEST_DATA_DIR = TEST_ROOT_DIR / 'data'
TEST_TEMP_DIR = Path(tempfile.gettempdir()) / 'personal_ai_test'

def setup_test_environment(config_overrides=None):
    """
    Sets up the common test environment for all test types.
    
    Args:
        config_overrides (dict, optional): Dictionary of configuration overrides. Defaults to None.
        
    Returns:
        dict: Test configuration dictionary
    """
    # Create test directories if they don't exist
    os.makedirs(TEST_DATA_DIR, exist_ok=True)
    os.makedirs(TEST_TEMP_DIR, exist_ok=True)
    
    # Set up environment variables for testing
    os.environ['PERSONAL_AI_ENV'] = 'test'
    os.environ['PERSONAL_AI_CONFIG_DIR'] = str(TEST_TEMP_DIR)
    
    # Create base test configuration
    config = create_test_config(config_overrides or {})
    
    # Configure test database paths
    os.environ['PERSONAL_AI_DB_PATH'] = str(TEST_TEMP_DIR / "test.db")
    os.environ['PERSONAL_AI_VECTOR_DB_PATH'] = str(TEST_TEMP_DIR / "vector_db")
    
    return config

def teardown_test_environment():
    """
    Cleans up the test environment after tests are complete.
    """
    # Remove temporary test files and directories
    if TEST_TEMP_DIR.exists():
        shutil.rmtree(TEST_TEMP_DIR, ignore_errors=True)
    
    # Reset environment variables
    env_vars = [
        'PERSONAL_AI_ENV', 
        'PERSONAL_AI_CONFIG_DIR', 
        'PERSONAL_AI_DB_PATH', 
        'PERSONAL_AI_VECTOR_DB_PATH'
    ]
    
    for var in env_vars:
        if var in os.environ:
            del os.environ[var]

def load_test_data(data_name, data_format='json'):
    """
    Loads test data from the test data directory.
    
    Args:
        data_name (str): Name of the test data file (without extension)
        data_format (str, optional): Format of the test data file. Defaults to 'json'.
        
    Returns:
        dict: Loaded test data
    """
    # Construct path to test data file
    data_file = TEST_DATA_DIR / f"{data_name}.{data_format}"
    
    # Check if file exists
    if not data_file.exists():
        raise FileNotFoundError(f"Test data file not found: {data_file}")
    
    # Load and parse data based on format
    if data_format == 'json':
        with open(data_file, 'r') as f:
            return json.load(f)
    elif data_format == 'yaml':
        try:
            import yaml
            with open(data_file, 'r') as f:
                return yaml.safe_load(f)
        except ImportError:
            raise ImportError("PyYAML is required to load YAML test data")
    else:
        raise ValueError(f"Unsupported data format: {data_format}")

def create_test_config(overrides=None):
    """
    Creates a test configuration dictionary with default test settings.
    
    Args:
        overrides (dict, optional): Configuration overrides. Defaults to None.
        
    Returns:
        dict: Test configuration dictionary
    """
    # Create base configuration with test settings
    config = {
        "general": {
            "app_name": "Personal AI Agent Test",
            "version": "test",
            "language": "en",
        },
        "privacy": {
            "local_storage_only": True,
            "analytics_enabled": False,
            "error_reporting": False,
        },
        "voice": {
            "enabled": False,
            "input_enabled": False,
            "output_enabled": False,
            "voice_id": "default",
        },
        "personality": {
            "name": "Test Assistant",
            "style": "helpful",
            "formality": "neutral",
            "verbosity": "balanced",
        },
        "llm": {
            "provider": "mock",
            "model": "test-model",
            "temperature": 0.0,
            "max_tokens": 100,
            "use_local_llm": False,
            "local_model_path": "",
        },
        "memory": {
            "vector_db_path": str(TEST_TEMP_DIR / "vector_db"),
            "max_memory_items": 100,
            "context_window_size": 5,
        },
        "storage": {
            "base_path": str(TEST_TEMP_DIR / "data"),
            "backup_enabled": False,
            "backup_frequency": "never",
            "backup_count": 0,
        },
        "search": {
            "enabled": False,
            "provider": "mock",
            "max_results": 3,
        },
        "testing": {
            "mock_responses": True,
            "temp_dir": str(TEST_TEMP_DIR),
            "data_dir": str(TEST_DATA_DIR),
        }
    }
    
    # Override with any provided settings
    if overrides:
        _deep_update(config, overrides)
    
    return config

def _deep_update(d, u):
    """Helper function to update nested dictionaries"""
    for k, v in u.items():
        if isinstance(v, dict) and k in d and isinstance(d[k], dict):
            _deep_update(d[k], v)
        else:
            d[k] = v