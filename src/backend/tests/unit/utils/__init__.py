"""
Initialization file for the unit tests of utility modules in the Personal AI Agent backend.
This file provides common imports, constants, and test utilities specific to testing the utility functions.
"""

import os
from pathlib import Path
import pytest
from unittest.mock import MagicMock, patch

# Import from parent module
from .. import (
    UNIT_TEST_DIR,
    MOCK_DATA_DIR,
    UNIT_TEST_MARKER,
    setup_unit_test_environment,
    load_mock_data
)

# Define utils-specific constants
UTILS_TEST_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
UTILS_MOCK_DATA_DIR = UTILS_TEST_DIR / 'mock_data'
UTILS_TEST_MARKER = pytest.mark.utils

def load_utils_mock_data(data_name, data_format='json'):
    """
    Loads mock data specifically for utils tests from the utils mock data directory.
    
    Args:
        data_name (str): Name of the mock data file (without extension)
        data_format (str, optional): Format of the mock data file. Defaults to 'json'.
        
    Returns:
        dict: Loaded mock data
    """
    # Construct path to utils mock data file
    mock_data_file = UTILS_MOCK_DATA_DIR / f"{data_name}.{data_format}"
    
    # If mock data doesn't exist in utils directory, fall back to common mock data
    if not mock_data_file.exists():
        return load_mock_data(data_name, data_format)
    
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

def create_mock_utils_dependency(dependency_name, method_returns=None):
    """
    Creates a mock for common utility dependencies.
    
    Args:
        dependency_name (str): Name of the dependency to mock
        method_returns (dict, optional): Dictionary of method names and their return values.
            Defaults to None.
        
    Returns:
        MagicMock: Configured mock dependency
    """
    # Create a MagicMock instance for the dependency
    mock_dependency = MagicMock(spec=object)
    mock_dependency.__name__ = dependency_name
    
    # Configure mock methods based on method_returns dictionary
    if method_returns:
        for method_name, return_value in method_returns.items():
            method_mock = MagicMock()
            if callable(return_value):
                method_mock.side_effect = return_value
            else:
                method_mock.return_value = return_value
            setattr(mock_dependency, method_name, method_mock)
    
    return mock_dependency