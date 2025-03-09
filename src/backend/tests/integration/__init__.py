"""
Initialization file for the integration tests package that defines common utilities, constants, 
and configurations specific to integration testing of the Personal AI Agent backend.
This file provides integration-specific test utilities that build upon the base test framework.
"""

import os
import tempfile
import uuid
from pathlib import Path
import pytest

# Import base test utilities
from .. import (
    setup_test_environment,
    teardown_test_environment,
    TEST_ROOT_DIR,
    TEST_DATA_DIR,
)

# Define integration test directory constants
INTEGRATION_TEST_DIR = Path(tempfile.gettempdir()) / 'personal_ai_integration_test'
INTEGRATION_DB_DIR = INTEGRATION_TEST_DIR / 'db'
INTEGRATION_VECTOR_DB_DIR = INTEGRATION_TEST_DIR / 'vector_db'
INTEGRATION_BACKUP_DIR = INTEGRATION_TEST_DIR / 'backup'

def setup_integration_environment(config_overrides=None):
    """
    Sets up the integration test environment with specific configurations for integration testing.
    
    Args:
        config_overrides (dict): Configuration overrides to apply to the test environment
        
    Returns:
        dict: Integration test configuration dictionary
    """
    # Call the base setup to establish the test environment with user overrides
    config = setup_test_environment(config_overrides)
    
    # Create integration-specific test directories
    os.makedirs(INTEGRATION_TEST_DIR, exist_ok=True)
    os.makedirs(INTEGRATION_DB_DIR, exist_ok=True)
    os.makedirs(INTEGRATION_VECTOR_DB_DIR, exist_ok=True)
    os.makedirs(INTEGRATION_BACKUP_DIR, exist_ok=True)
    
    # Set up integration-specific environment variables
    os.environ['PERSONAL_AI_INTEGRATION_TEST'] = 'true'
    os.environ['PERSONAL_AI_DB_PATH'] = str(INTEGRATION_DB_DIR / "integration.db")
    os.environ['PERSONAL_AI_VECTOR_DB_PATH'] = str(INTEGRATION_VECTOR_DB_DIR)
    os.environ['PERSONAL_AI_BACKUP_PATH'] = str(INTEGRATION_BACKUP_DIR)
    
    # Update config with integration-specific settings
    if 'memory' in config:
        config['memory']['vector_db_path'] = str(INTEGRATION_VECTOR_DB_DIR)
        
    if 'storage' in config:
        config['storage']['base_path'] = str(INTEGRATION_TEST_DIR / "data")
        config['storage']['backup_enabled'] = True
        config['storage']['backup_path'] = str(INTEGRATION_BACKUP_DIR)
    
    if 'testing' in config:
        config['testing']['integration'] = True
        config['testing']['mock_responses'] = False  # Use real responses in integration tests
        config['testing']['temp_dir'] = str(INTEGRATION_TEST_DIR)
    else:
        config['testing'] = {
            'integration': True,
            'mock_responses': False,
            'temp_dir': str(INTEGRATION_TEST_DIR)
        }
    
    return config

def teardown_integration_environment():
    """
    Cleans up the integration test environment after tests are complete.
    """
    # Call the base teardown to clean up the general test environment
    teardown_test_environment()
    
    # Remove integration-specific temporary files and directories
    if INTEGRATION_TEST_DIR.exists():
        import shutil
        shutil.rmtree(INTEGRATION_TEST_DIR, ignore_errors=True)
    
    # Reset integration-specific environment variables
    integration_env_vars = [
        'PERSONAL_AI_INTEGRATION_TEST',
        'PERSONAL_AI_BACKUP_PATH'
    ]
    
    for var in integration_env_vars:
        if var in os.environ:
            del os.environ[var]

def integration_test_marker():
    """
    Returns a pytest marker for integration tests.
    
    This function returns a pytest marker that can be used to decorate test functions
    or classes as integration tests. These tests are typically run separately from
    unit tests and may require additional setup.
    
    Returns:
        pytest.mark: A pytest marker for identifying integration tests
    """
    return pytest.mark.integration

def create_integration_db_path(db_name):
    """
    Creates a path for integration test databases with a unique identifier.
    
    Args:
        db_name (str): Base name for the database
        
    Returns:
        Path: Path object for the database
    """
    # Ensure the integration database directory exists
    os.makedirs(INTEGRATION_DB_DIR, exist_ok=True)
    
    # Generate a unique identifier for the database
    unique_id = str(uuid.uuid4())[:8]
    
    # Create a path combining the directory, name, and identifier
    db_path = INTEGRATION_DB_DIR / f"{db_name}_{unique_id}.db"
    
    return db_path