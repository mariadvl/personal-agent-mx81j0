# src/backend/tests/unit/api/__init__.py
import pytest  # 7.0+
from fastapi.testclient import TestClient  # Assuming v0.23.0+

BASE_URL = "/api"


def create_test_client(app):
    """
    Creates a FastAPI TestClient instance for API testing

    Args:
        app: FastAPI

    Returns:
        TestClient: Configured test client for making requests to the API
    """
    # Import TestClient from fastapi.testclient
    # Create a new TestClient instance with the provided FastAPI app
    client = TestClient(app)
    # Return the configured test client
    return client


__all__ = ["create_test_client", "BASE_URL"]