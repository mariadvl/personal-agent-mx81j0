"""
Initialization file for the unit tests package in the Personal AI Agent.
This file provides common utilities, constants, and configurations specifically for unit testing,
establishing a foundation for testing individual components in isolation with appropriate mocks.
"""

import os
from pathlib import Path
import pytest
from unittest.mock import MagicMock, patch

# Import common test utilities from parent package
from .. import (
    setup_test_environment,
    teardown_test_environment,
    load_test_data,
    TEST_ROOT_DIR,
    TEST_DATA_DIR
)

# Define unit test specific constants
UNIT_TEST_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
MOCK_DATA_DIR = UNIT_TEST_DIR / 'mock_data'
UNIT_TEST_MARKER = pytest.mark.unit

def setup_unit_test_environment(config_overrides=None):
    """
    Sets up the environment specifically for unit tests.
    
    Args:
        config_overrides (dict, optional): Dictionary of configuration overrides. Defaults to None.
        
    Returns:
        dict: Test configuration dictionary
    """
    # Call the common setup_test_environment function with unit test specific overrides
    unit_config_overrides = {
        "testing": {
            "mock_responses": True,
            "test_type": "unit"
        }
    }
    
    # Merge with provided overrides
    if config_overrides:
        for key, value in config_overrides.items():
            if key in unit_config_overrides and isinstance(unit_config_overrides[key], dict):
                unit_config_overrides[key].update(value)
            else:
                unit_config_overrides[key] = value
    
    # Set up the test environment with unit-specific overrides
    test_config = setup_test_environment(unit_config_overrides)
    
    # Set unit test specific environment variables
    os.environ['PERSONAL_AI_TEST_TYPE'] = 'unit'
    
    # Configure mocking settings for unit tests
    os.environ['PERSONAL_AI_MOCK_SERVICES'] = 'true'
    
    # Create mock data directory if it doesn't exist
    os.makedirs(MOCK_DATA_DIR, exist_ok=True)
    
    return test_config

def load_mock_data(data_name, data_format='json'):
    """
    Loads mock data for unit tests from the mock data directory.
    
    Args:
        data_name (str): Name of the mock data file (without extension)
        data_format (str, optional): Format of the mock data file. Defaults to 'json'.
        
    Returns:
        dict: Loaded mock data
    """
    # Construct path to mock data file
    mock_data_file = MOCK_DATA_DIR / f"{data_name}.{data_format}"
    
    # If mock data doesn't exist in unit test directory, try the common test data directory
    if not mock_data_file.exists():
        return load_test_data(data_name, data_format)
    
    # Load and parse data based on format
    if data_format == 'json':
        import json
        with open(mock_data_file, 'r') as f:
            return json.load(f)
    elif data_format == 'yaml':
        try:
            import yaml
            with open(mock_data_file, 'r') as f:
                return yaml.safe_load(f)
        except ImportError:
            raise ImportError("PyYAML is required to load YAML mock data")
    else:
        raise ValueError(f"Unsupported data format: {data_format}")

def create_mock_service(service_name, method_returns=None):
    """
    Creates a generic mock service for unit testing.
    
    Args:
        service_name (str): Name of the service to mock
        method_returns (dict, optional): Dictionary of method names and their return values.
            Defaults to None.
        
    Returns:
        MagicMock: Configured mock service
    """
    # Create a MagicMock instance for the service
    mock_service = MagicMock(spec=object)
    mock_service.__name__ = service_name
    
    # Configure mock methods based on method_returns dictionary
    if method_returns:
        for method_name, return_value in method_returns.items():
            method_mock = MagicMock()
            if callable(return_value):
                method_mock.side_effect = return_value
            else:
                method_mock.return_value = return_value
            setattr(mock_service, method_name, method_mock)
    
    return mock_service

def patch_dependency(target, return_value=None):
    """
    Creates a context manager for patching dependencies in unit tests.
    
    Args:
        target (str): The target to patch
        return_value (any, optional): The return value for the patched target.
            Defaults to None.
        
    Returns:
        patch: Context manager for patching
    """
    # Create a patch context manager for the target
    return patch(target, return_value=return_value)

class UnitTestBase:
    """
    Base class for unit tests providing common utilities and setup.
    """
    
    def __init__(self):
        """Initialize the unit test base class"""
        # Set up test configuration
        self.test_config = setup_unit_test_environment()
        
        # Initialize mock data directory path
        self.mock_data_dir = MOCK_DATA_DIR
        
        # Set up common test properties
        self._mocks = {}
    
    def setup_method(self):
        """
        Set up method called before each test.
        """
        # Set up clean test environment for each test
        self.test_config = setup_unit_test_environment()
        
        # Initialize mocks for dependencies
        self._mocks = {}
    
    def teardown_method(self):
        """
        Tear down method called after each test.
        """
        # Clean up resources created during the test
        self._mocks.clear()
        
        # Reset mocks and patches
        teardown_test_environment()
    
    def get_mock_data(self, data_name, data_format='json'):
        """
        Load mock data for the test.
        
        Args:
            data_name (str): Name of the mock data file (without extension)
            data_format (str, optional): Format of the mock data file. Defaults to 'json'.
            
        Returns:
            dict: Loaded mock data
        """
        return load_mock_data(data_name, data_format)