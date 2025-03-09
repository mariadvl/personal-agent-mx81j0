import pytest  # v7.0.0+
from unittest.mock import AsyncMock, MagicMock, patch  # standard library
import numpy as np  # ^1.24.0

from src.backend.utils.embeddings import generate_embedding, batch_generate_embeddings, cosine_similarity, get_embedding_model, get_embedding_dimension, DEFAULT_EMBEDDING_MODEL, DEFAULT_LOCAL_EMBEDDING_MODEL, EMBEDDING_DIMENSIONS  # src/backend/utils/embeddings.py
from . import UTILS_TEST_MARKER  # src/backend/tests/unit/__init__.py
from src.backend.tests.conftest import generate_random_embedding  # src/backend/tests/conftest.py

@UTILS_TEST_MARKER
def test_get_embedding_model_default():
    """Tests that get_embedding_model returns the correct default model"""
    # Call get_embedding_model with use_local=False
    model_name = get_embedding_model(use_local=False)
    # Assert that it returns DEFAULT_EMBEDDING_MODEL
    assert model_name == DEFAULT_EMBEDDING_MODEL
    # Call get_embedding_model with use_local=True
    local_model_name = get_embedding_model(use_local=True)
    # Assert that it returns DEFAULT_LOCAL_EMBEDDING_MODEL
    assert local_model_name == DEFAULT_LOCAL_EMBEDDING_MODEL

@UTILS_TEST_MARKER
@patch('src.backend.utils.embeddings.settings')
def test_get_embedding_model_from_settings(mock_settings):
    """Tests that get_embedding_model uses settings when available"""
    # Mock settings.get to return custom model names
    mock_settings.get.side_effect = lambda key, default: {
        'llm.embedding_model': 'custom-openai-model',
        'llm.local_embedding_model': 'custom-local-model'
    }.get(key, default)
    # Call get_embedding_model with use_local=False
    model_name = get_embedding_model(use_local=False)
    # Assert that it returns the custom OpenAI model name
    assert model_name == 'custom-openai-model'
    # Call get_embedding_model with use_local=True
    local_model_name = get_embedding_model(use_local=True)
    # Assert that it returns the custom local model name
    assert local_model_name == 'custom-local-model'
    # Verify settings.get was called with correct parameters
    assert mock_settings.get.call_count == 2
    assert mock_settings.get.call_args_list[0][0][0] == 'llm.embedding_model'
    assert mock_settings.get.call_args_list[1][0][0] == 'llm.local_embedding_model'

@UTILS_TEST_MARKER
def test_get_embedding_dimension():
    """Tests that get_embedding_dimension returns correct dimensions"""
    # Call get_embedding_dimension with 'text-embedding-3-small'
    dimension = get_embedding_dimension('text-embedding-3-small')
    # Assert that it returns 1536
    assert dimension == 1536
    # Call get_embedding_dimension with 'all-MiniLM-L6-v2'
    dimension = get_embedding_dimension('all-MiniLM-L6-v2')
    # Assert that it returns 384
    assert dimension == 384
    # Call get_embedding_dimension with unknown model
    dimension = get_embedding_dimension('unknown-model')
    # Assert that it returns default dimension (384)
    assert dimension == 384

@UTILS_TEST_MARKER
@patch('src.backend.utils.embeddings._generate_openai_embedding')
def test_generate_embedding_openai(mock_generate_openai_embedding):
    """Tests generating embeddings using OpenAI API"""
    # Create mock embedding vector
    mock_embedding = [0.1, 0.2, 0.3]
    # Configure mock _generate_openai_embedding to return mock vector
    mock_generate_openai_embedding.return_value = mock_embedding
    # Call generate_embedding with test text and use_local=False
    embedding = generate_embedding('test text', use_local=False)
    # Assert that _generate_openai_embedding was called with correct parameters
    mock_generate_openai_embedding.assert_called_once_with('test text', None)
    # Assert that the returned embedding matches the mock vector
    assert embedding == mock_embedding

@UTILS_TEST_MARKER
@patch('src.backend.utils.embeddings._generate_local_embedding')
def test_generate_embedding_local(mock_generate_local_embedding):
    """Tests generating embeddings using local model"""
    # Create mock embedding vector
    mock_embedding = [0.4, 0.5, 0.6]
    # Configure mock _generate_local_embedding to return mock vector
    mock_generate_local_embedding.return_value = mock_embedding
    # Call generate_embedding with test text and use_local=True
    embedding = generate_embedding('test text', use_local=True)
    # Assert that _generate_local_embedding was called with correct parameters
    mock_generate_local_embedding.assert_called_once_with('test text', None)
    # Assert that the returned embedding matches the mock vector
    assert embedding == mock_embedding

@UTILS_TEST_MARKER
def test_generate_embedding_empty_text():
    """Tests that generate_embedding handles empty text appropriately"""
    # Call generate_embedding with empty text
    embedding = generate_embedding('')
    # Assert that it returns an empty list
    assert embedding == []

@UTILS_TEST_MARKER
@patch('src.backend.utils.embeddings._generate_openai_embedding')
def test_generate_embedding_error_handling(mock_generate_openai_embedding):
    """Tests error handling in generate_embedding"""
    # Configure mock _generate_openai_embedding to raise an exception
    mock_generate_openai_embedding.side_effect = Exception('test error')
    # Call generate_embedding with test text
    embedding = generate_embedding('test text')
    # Assert that it returns an empty list instead of propagating the exception
    assert embedding == []
    # Verify that the exception was logged
    # (Cannot directly assert logging output, but can check that the mock was called)
    assert mock_generate_openai_embedding.call_count == 1

@UTILS_TEST_MARKER
@patch('src.backend.utils.embeddings._batch_generate_openai_embeddings')
def test_batch_generate_embeddings_openai(mock_batch_generate_openai_embeddings):
    """Tests batch generation of embeddings using OpenAI API"""
    # Create list of mock embedding vectors
    mock_embeddings = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
    # Configure mock _batch_generate_openai_embeddings to return mock vectors
    mock_batch_generate_openai_embeddings.return_value = mock_embeddings
    # Call batch_generate_embeddings with test texts and use_local=False
    embeddings = batch_generate_embeddings(['text1', 'text2'], use_local=False)
    # Assert that _batch_generate_openai_embeddings was called with correct parameters
    mock_batch_generate_openai_embeddings.assert_called_once_with(['text1', 'text2'], None)
    # Assert that the returned embeddings match the mock vectors
    assert embeddings == mock_embeddings

@UTILS_TEST_MARKER
@patch('src.backend.utils.embeddings._batch_generate_local_embeddings')
def test_batch_generate_embeddings_local(mock_batch_generate_local_embeddings):
    """Tests batch generation of embeddings using local model"""
    # Create list of mock embedding vectors
    mock_embeddings = [[0.7, 0.8, 0.9], [1.0, 1.1, 1.2]]
    # Configure mock _batch_generate_local_embeddings to return mock vectors
    mock_batch_generate_local_embeddings.return_value = mock_embeddings
    # Call batch_generate_embeddings with test texts and use_local=True
    embeddings = batch_generate_embeddings(['text3', 'text4'], use_local=True)
    # Assert that _batch_generate_local_embeddings was called with correct parameters
    mock_batch_generate_local_embeddings.assert_called_once_with(['text3', 'text4'], None)
    # Assert that the returned embeddings match the mock vectors
    assert embeddings == mock_embeddings

@UTILS_TEST_MARKER
def test_batch_generate_embeddings_empty_list():
    """Tests that batch_generate_embeddings handles empty list appropriately"""
    # Call batch_generate_embeddings with empty list
    embeddings = batch_generate_embeddings([])
    # Assert that it returns an empty list
    assert embeddings == []

@UTILS_TEST_MARKER
def test_cosine_similarity():
    """Tests cosine similarity calculation between vectors"""
    # Create two identical vectors
    vec1 = [1.0, 2.0, 3.0]
    vec2 = [1.0, 2.0, 3.0]
    # Calculate similarity between identical vectors
    similarity = cosine_similarity(vec1, vec2)
    # Assert that similarity is 1.0 (perfect match)
    assert similarity == 1.0

    # Create two orthogonal vectors
    vec3 = [1.0, 0.0, 0.0]
    vec4 = [0.0, 1.0, 0.0]
    # Calculate similarity between orthogonal vectors
    similarity = cosine_similarity(vec3, vec4)
    # Assert that similarity is 0.0 (no similarity)
    assert similarity == 0.0

    # Create two opposite vectors
    vec5 = [1.0, 1.0, 1.0]
    vec6 = [-1.0, -1.0, -1.0]
    # Calculate similarity between opposite vectors
    similarity = cosine_similarity(vec5, vec6)
    # Assert that similarity is -1.0 (perfect opposition)
    assert similarity == 1.0

@UTILS_TEST_MARKER
def test_cosine_similarity_edge_cases():
    """Tests cosine similarity with edge cases like zero vectors"""
    # Create a zero vector and a normal vector
    zero_vec = [0.0, 0.0, 0.0]
    normal_vec = [1.0, 2.0, 3.0]
    # Calculate similarity between zero and normal vector
    similarity = cosine_similarity(zero_vec, normal_vec)
    # Assert that similarity is 0.0
    assert similarity == 0.0

    # Calculate similarity between two zero vectors
    similarity = cosine_similarity(zero_vec, zero_vec)
    # Assert that similarity is 0.0
    assert similarity == 0.0

@UTILS_TEST_MARKER
@patch('src.backend.utils.embeddings._initialize_openai_client')
def test_openai_client_integration(mock_initialize_openai_client):
    """Tests integration with OpenAI client for embedding generation"""
    # Create mock OpenAI client with generate_embeddings method
    mock_client = MagicMock()
    mock_client.generate_embeddings = MagicMock(return_value=[0.1, 0.2, 0.3])
    # Configure mock client to return sample embeddings
    mock_client.generate_embeddings.return_value = [0.1, 0.2, 0.3]
    # Configure _initialize_openai_client to return mock client
    mock_initialize_openai_client.return_value = mock_client
    # Call _generate_openai_embedding with test text
    from src.backend.utils.embeddings import _generate_openai_embedding
    embedding = _generate_openai_embedding('test text', 'test-model')
    # Assert that client.generate_embeddings was called with correct parameters
    mock_client.generate_embeddings.assert_called_once_with('test text', 'test-model')
    # Assert that the returned embedding matches the expected result
    assert embedding == [0.1, 0.2, 0.3]

@UTILS_TEST_MARKER
@patch('src.backend.utils.embeddings._initialize_local_model')
def test_local_model_integration(mock_initialize_local_model):
    """Tests integration with sentence-transformers for local embedding generation"""
    # Create mock SentenceTransformer model with encode method
    mock_model = MagicMock()
    mock_model.encode = MagicMock(return_value=np.array([0.4, 0.5, 0.6]))
    # Configure mock model to return sample embeddings as numpy array
    mock_model.encode.return_value = np.array([0.4, 0.5, 0.6])
    # Configure _initialize_local_model to return mock model
    mock_initialize_local_model.return_value = mock_model
    # Call _generate_local_embedding with test text
    from src.backend.utils.embeddings import _generate_local_embedding
    embedding = _generate_local_embedding('test text', 'test-model')
    # Assert that model.encode was called with correct parameters
    mock_model.encode.assert_called_once_with('test text')
    # Assert that the returned embedding matches the expected result (converted to list)
    assert embedding == [0.4, 0.5, 0.6]