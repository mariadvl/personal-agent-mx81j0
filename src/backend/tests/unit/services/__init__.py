"""
Initialization file for the services unit tests package. This file provides common utilities,
fixtures, and mock factories specifically for testing service components of the Personal AI Agent.
"""

import os
from pathlib import Path
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

# Import from unit test package
from ..__init__ import (
    setup_unit_test_environment,
    UnitTestBase,
    UNIT_TEST_MARKER,
    load_mock_data
)

# Define services test directory constants
SERVICES_TEST_DIR = Path(os.path.dirname(os.path.abspath(__file__)))
SERVICES_MOCK_DATA_DIR = SERVICES_TEST_DIR / 'mock_data'
SERVICE_TEST_MARKER = pytest.mark.service

def create_mock_memory_service(method_returns=None):
    """
    Creates a mock MemoryService for testing other services.
    
    Args:
        method_returns (dict, optional): Dictionary of method names and their return values.
            Defaults to None.
        
    Returns:
        AsyncMock: Configured mock memory service
    """
    # Create an AsyncMock instance for the MemoryService
    mock_memory_service = AsyncMock()
    mock_memory_service.__name__ = 'MemoryService'
    
    # Default return values for common methods if not specified
    default_returns = {
        'store_memory': AsyncMock(return_value={"id": "mock-memory-id", "content": "Test memory"}),
        'retrieve_context': AsyncMock(return_value=["Test context item 1", "Test context item 2"]),
        'search_memory': AsyncMock(return_value=[{"id": "memory-1", "content": "Test memory 1"}, 
                                               {"id": "memory-2", "content": "Test memory 2"}]),
        'update_memory': AsyncMock(return_value={"id": "memory-1", "content": "Updated memory"}),
        'delete_memory': AsyncMock(return_value=True)
    }
    
    # Configure mock methods based on method_returns dictionary
    if method_returns:
        for method_name, return_value in method_returns.items():
            if callable(return_value):
                getattr(mock_memory_service, method_name).side_effect = return_value
            else:
                getattr(mock_memory_service, method_name).return_value = return_value
    else:
        # Set default return values if no custom returns provided
        for method_name, return_value in default_returns.items():
            getattr(mock_memory_service, method_name).return_value = return_value
    
    return mock_memory_service

def create_mock_llm_service(method_returns=None):
    """
    Creates a mock LLMService for testing other services.
    
    Args:
        method_returns (dict, optional): Dictionary of method names and their return values.
            Defaults to None.
        
    Returns:
        AsyncMock: Configured mock LLM service
    """
    # Create an AsyncMock instance for the LLMService
    mock_llm_service = AsyncMock()
    mock_llm_service.__name__ = 'LLMService'
    
    # Default return values for common methods if not specified
    default_returns = {
        'generate_response': AsyncMock(return_value="This is a mock LLM response"),
        'summarize_text': AsyncMock(return_value="This is a mock summary"),
        'extract_information': AsyncMock(return_value={"key1": "value1", "key2": "value2"})
    }
    
    # Configure mock methods based on method_returns dictionary
    if method_returns:
        for method_name, return_value in method_returns.items():
            if callable(return_value):
                getattr(mock_llm_service, method_name).side_effect = return_value
            else:
                getattr(mock_llm_service, method_name).return_value = return_value
    else:
        # Set default return values if no custom returns provided
        for method_name, return_value in default_returns.items():
            getattr(mock_llm_service, method_name).return_value = return_value
    
    return mock_llm_service

def create_mock_event_bus():
    """
    Creates a mock event bus for testing services.
    
    Returns:
        MagicMock: Configured mock event bus
    """
    # Create a MagicMock instance for the event bus
    mock_event_bus = MagicMock()
    mock_event_bus.__name__ = 'EventBus'
    
    # Track published events
    mock_event_bus.published_events = []
    
    # Configure publish method
    def mock_publish(event_name, payload=None):
        mock_event_bus.published_events.append({
            'event': event_name,
            'payload': payload
        })
    
    mock_event_bus.publish = MagicMock(side_effect=mock_publish)
    
    # Configure subscribe method
    mock_event_bus.handlers = {}
    
    def mock_subscribe(event_name, handler):
        if event_name not in mock_event_bus.handlers:
            mock_event_bus.handlers[event_name] = []
        mock_event_bus.handlers[event_name].append(handler)
    
    mock_event_bus.subscribe = MagicMock(side_effect=mock_subscribe)
    
    return mock_event_bus

def create_mock_context_manager(method_returns=None):
    """
    Creates a mock context manager for testing conversation service.
    
    Args:
        method_returns (dict, optional): Dictionary of method names and their return values.
            Defaults to None.
        
    Returns:
        AsyncMock: Configured mock context manager
    """
    # Create an AsyncMock instance for the context manager
    mock_context_manager = AsyncMock()
    mock_context_manager.__name__ = 'ContextManager'
    
    # Default return values for common methods if not specified
    default_returns = {
        'build_prompt_with_context': AsyncMock(return_value="This is a mock prompt with context"),
        'get_relevant_context': AsyncMock(return_value=["Context item 1", "Context item 2"]),
        'store_interaction': AsyncMock(return_value=None)
    }
    
    # Configure mock methods based on method_returns dictionary
    if method_returns:
        for method_name, return_value in method_returns.items():
            if callable(return_value):
                getattr(mock_context_manager, method_name).side_effect = return_value
            else:
                getattr(mock_context_manager, method_name).return_value = return_value
    else:
        # Set default return values if no custom returns provided
        for method_name, return_value in default_returns.items():
            getattr(mock_context_manager, method_name).return_value = return_value
    
    return mock_context_manager

def load_service_mock_data(data_name, data_format='json'):
    """
    Loads mock data specifically for service tests.
    
    Args:
        data_name (str): Name of the mock data file (without extension)
        data_format (str, optional): Format of the mock data file. Defaults to 'json'.
        
    Returns:
        dict: Loaded mock data
    """
    # Construct path to service-specific mock data file
    mock_data_file = SERVICES_MOCK_DATA_DIR / f"{data_name}.{data_format}"
    
    # If file exists in services mock data directory, load it directly
    if mock_data_file.exists():
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
    
    # If not found in services directory, fall back to common unit test mock data
    return load_mock_data(data_name, data_format)

class ServiceTestBase(UnitTestBase):
    """
    Base class for service unit tests providing common utilities and mock factories.
    """
    
    def __init__(self):
        """Initialize the service test base class"""
        # Call parent constructor
        super().__init__()
        
        # Set up mock_data_dir to SERVICES_MOCK_DATA_DIR
        self.mock_data_dir = SERVICES_MOCK_DATA_DIR
        
        # Initialize mock services to None
        self.mock_memory_service = None
        self.mock_llm_service = None
        self.mock_event_bus = None
    
    def setup_method(self):
        """
        Set up method called before each test.
        """
        # Call parent setup_method
        super().setup_method()
        
        # Create default mock services
        self.create_default_mocks()
    
    def teardown_method(self):
        """
        Tear down method called after each test.
        """
        # Reset mock services
        self.mock_memory_service = None
        self.mock_llm_service = None
        self.mock_event_bus = None
        
        # Call parent teardown_method
        super().teardown_method()
    
    def create_default_mocks(self):
        """
        Creates default mock services for testing.
        """
        # Create mock services using the factory functions
        self.mock_memory_service = create_mock_memory_service()
        self.mock_llm_service = create_mock_llm_service()
        self.mock_event_bus = create_mock_event_bus()
    
    def get_service_mock_data(self, data_name, data_format='json'):
        """
        Load mock data for service tests.
        
        Args:
            data_name (str): Name of the mock data file (without extension)
            data_format (str, optional): Format of the mock data file. Defaults to 'json'.
            
        Returns:
            dict: Loaded mock data
        """
        return load_service_mock_data(data_name, data_format)