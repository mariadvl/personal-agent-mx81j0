import pytest
import os
import shutil
import uuid
import time
import numpy as np  # v1.24.0+

from src.backend.database.vector_db import VectorDatabase  # Assuming v0.4.18+
from src.backend.memory.vector_store import VectorStore  # Assuming v1.0
from src.backend.utils.embeddings import generate_embedding, cosine_similarity  # Assuming v1.0
from src.backend.tests.conftest import create_test_embeddings, TEST_VECTOR_DB_DIR  # Assuming v1.0


def setup_function():
    """Setup function that runs before each test to ensure clean test environment"""
    # Ensure test vector database directory exists
    os.makedirs(TEST_VECTOR_DB_DIR, exist_ok=True)

    # Clean up any existing test data for a fresh start
    for item in os.listdir(TEST_VECTOR_DB_DIR):
        item_path = os.path.join(TEST_VECTOR_DB_DIR, item)
        if os.path.isfile(item_path):
            os.remove(item_path)
        elif os.path.isdir(item_path):
            shutil.rmtree(item_path)


def teardown_function():
    """Teardown function that runs after each test to clean up test environment"""
    # Clean up test vector database
    if os.path.exists(TEST_VECTOR_DB_DIR):
        shutil.rmtree(TEST_VECTOR_DB_DIR)

    # Remove temporary test data
    for item in os.listdir(tempfile.gettempdir()):
        if item.startswith("personal_ai_test"):
            item_path = os.path.join(tempfile.gettempdir(), item)
            if os.path.isfile(item_path):
                os.remove(item_path)
            elif os.path.isdir(item_path):
                shutil.rmtree(item_path)


@pytest.mark.asyncio
async def test_vector_search_basic():
    """Test basic vector search functionality with a small set of embeddings"""
    # Initialize VectorDatabase with test directory
    db = VectorDatabase(persist_directory=TEST_VECTOR_DB_DIR)

    # Create a set of test embeddings with known content
    ids, vectors, metadatas, texts = create_test_embeddings(count=5, dimension=384)

    # Add embeddings to the vector database
    for id, vector, metadata, text in zip(ids, vectors, metadatas, texts):
        await db.add_embedding(id=id, vector=vector, metadata=metadata, text=text)

    # Create a query vector similar to one of the test embeddings
    query_vector = vectors[0]

    # Perform a similarity search with the query vector
    results = await db.search_similar(query_vector=query_vector, limit=3)

    # Verify that the most similar embedding is returned first
    assert len(results) == 3
    assert results[0]["id"] == ids[0]

    # Verify that similarity scores are calculated correctly
    similarity_score = cosine_similarity(query_vector, vectors[0])
    assert abs(results[0]["score"] - (1.0 - similarity_score)) < 0.01

    # Close the database connection
    await db.close()


@pytest.mark.asyncio
async def test_vector_search_with_filters():
    """Test vector search with metadata filters"""
    # Initialize VectorDatabase with test directory
    db = VectorDatabase(persist_directory=TEST_VECTOR_DB_DIR)

    # Create test embeddings with different categories in metadata
    ids, vectors, metadatas, texts = create_test_embeddings(count=5, dimension=384)

    # Add embeddings to the vector database
    for id, vector, metadata, text in zip(ids, vectors, metadatas, texts):
        await db.add_embedding(id=id, vector=vector, metadata=metadata, text=text)

    # Perform a similarity search with a category filter
    query_vector = vectors[0]
    results = await db.search_similar(query_vector=query_vector, limit=3, filters={"category": "category_0"})

    # Verify that only embeddings with the specified category are returned
    assert len(results) <= 3
    for result in results:
        assert result["metadata"]["category"] == "category_0"

    # Perform a search with multiple filter conditions
    results = await db.search_similar(query_vector=query_vector, limit=3, filters={"category": "category_1"})

    # Verify that only embeddings matching all conditions are returned
    assert len(results) <= 3
    for result in results:
        assert result["metadata"]["category"] == "category_1"

    # Close the database connection
    await db.close()


@pytest.mark.asyncio
async def test_vector_search_limit():
    """Test vector search with different limit parameters"""
    # Initialize VectorDatabase with test directory
    db = VectorDatabase(persist_directory=TEST_VECTOR_DB_DIR)

    # Create a larger set of test embeddings (20+)
    ids, vectors, metadatas, texts = create_test_embeddings(count=25, dimension=384)

    # Add embeddings to the vector database
    for id, vector, metadata, text in zip(ids, vectors, metadatas, texts):
        await db.add_embedding(id=id, vector=vector, metadata=metadata, text=text)

    # Perform a similarity search with limit=5
    query_vector = vectors[0]
    results = await db.search_similar(query_vector=query_vector, limit=5)

    # Verify that exactly 5 results are returned
    assert len(results) == 5

    # Perform a similarity search with limit=10
    results = await db.search_similar(query_vector=query_vector, limit=10)

    # Verify that exactly 10 results are returned
    assert len(results) == 10

    # Perform a similarity search with limit=0 (should use default)
    results = await db.search_similar(query_vector=query_vector, limit=0)

    # Verify that the default number of results is returned
    assert len(results) == 10

    # Close the database connection
    await db.close()


@pytest.mark.asyncio
async def test_vector_search_by_text():
    """Test searching by text content rather than vector"""
    # Initialize VectorDatabase with test directory
    db = VectorDatabase(persist_directory=TEST_VECTOR_DB_DIR)

    # Create test embeddings with associated text content
    ids, vectors, metadatas, texts = create_test_embeddings(count=5, dimension=384)

    # Add embeddings to the vector database
    for id, vector, metadata, text in zip(ids, vectors, metadatas, texts):
        await db.add_embedding(id=id, vector=vector, metadata=metadata, text=text)

    # Perform a search using text query instead of vector
    query_text = "Test document 2"
    results = await db.search_by_text(query_text=query_text, limit=3)

    # Verify that semantically similar content is returned
    assert len(results) == 3
    assert results[0]["id"] == ids[2]

    # Compare results with vector-based search for the same content
    query_vector = vectors[2]
    vector_results = await db.search_similar(query_vector=query_vector, limit=3)

    # Verify that both approaches return similar results
    assert results[0]["id"] == vector_results[0]["id"]

    # Close the database connection
    await db.close()


@pytest.mark.asyncio
async def test_vector_store_integration():
    """Test integration between VectorStore and VectorDatabase"""
    # Initialize VectorDatabase with test directory
    db = VectorDatabase(persist_directory=TEST_VECTOR_DB_DIR)

    # Initialize VectorStore with the vector database
    vector_store = VectorStore(db)

    # Store text content using VectorStore
    text = "This is a test document for vector store integration"
    id = str(uuid.uuid4())
    metadata = {"category": "test"}
    await vector_store.store_text(text=text, id=id, metadata=metadata)

    # Verify that embeddings are created in the vector database
    results = await db.search_by_text(query_text=text, limit=1)
    assert len(results) == 1
    assert results[0]["id"] == id

    # Search for similar content using VectorStore
    search_results = await vector_store.search_by_text(query_text="test document", filters={"category": "test"})

    # Verify that search results match expected content
    assert len(search_results) == 1
    assert search_results[0]["id"] == id

    # Close the database connection
    await db.close()


@pytest.mark.asyncio
@pytest.mark.benchmark
async def test_vector_search_performance(benchmark):
    """Test performance of vector search with larger dataset"""
    # Initialize VectorDatabase with test directory
    db = VectorDatabase(persist_directory=TEST_VECTOR_DB_DIR)

    # Create a large set of test embeddings (1000+)
    num_vectors = 1500
    ids, vectors, metadatas, texts = create_test_embeddings(count=num_vectors, dimension=384)

    # Add embeddings to the vector database in batches
    batch_size = 100
    for i in range(0, num_vectors, batch_size):
        batch_ids = ids[i:i + batch_size]
        batch_vectors = vectors[i:i + batch_size]
        batch_metadatas = metadatas[i:i + batch_size]
        batch_texts = texts[i:i + batch_size]
        await db.batch_add_embeddings(ids=batch_ids, vectors=batch_vectors, metadatas=batch_metadatas, texts=batch_texts)

    # Measure time taken for similarity search
    query_vector = vectors[0]

    def search_operation():
        return db.search_similar(query_vector=query_vector, limit=10)

    start_time = time.time()
    results = await benchmark(search_operation)
    elapsed_time = time.time() - start_time

    # Verify that search completes within acceptable time (< 200ms)
    assert elapsed_time < 0.2

    # Perform multiple searches and calculate average time
    num_iterations = 5
    total_time = 0
    for _ in range(num_iterations):
        start_time = time.time()
        await db.search_similar(query_vector=query_vector, limit=10)
        total_time += time.time() - start_time
    average_time = total_time / num_iterations

    # Verify that performance remains consistent across searches
    assert average_time < 0.25

    # Close the database connection
    await db.close()


@pytest.mark.asyncio
async def test_vector_search_accuracy():
    """Test accuracy of vector search results"""
    # Initialize VectorDatabase with test directory
    db = VectorDatabase(persist_directory=TEST_VECTOR_DB_DIR)

    # Create test embeddings with known similarity relationships
    ids, vectors, metadatas, texts = create_test_embeddings(count=3, dimension=384)
    text1 = "This is a highly relevant document"
    text2 = "This document is somewhat relevant"
    text3 = "This document is not relevant"

    # Generate embeddings for the texts
    embedding1 = await generate_embedding(text1)
    embedding2 = await generate_embedding(text2)
    embedding3 = await generate_embedding(text3)

    # Add embeddings to the vector database
    await db.add_embedding(id=ids[0], vector=embedding1, metadata=metadatas[0], text=text1)
    await db.add_embedding(id=ids[1], vector=embedding2, metadata=metadatas[1], text=text2)
    await db.add_embedding(id=ids[2], vector=embedding3, metadata=metadatas[2], text=text3)

    # Perform similarity search with a query vector
    query_vector = embedding1
    results = await db.search_similar(query_vector=query_vector, limit=3)

    # Calculate actual cosine similarity between query and results
    similarity_scores = [cosine_similarity(query_vector, embedding1),
                         cosine_similarity(query_vector, embedding2),
                         cosine_similarity(query_vector, embedding3)]

    # Verify that results are ordered by actual similarity
    sorted_ids = [ids[i] for i in np.argsort(similarity_scores)[::-1]]
    assert [result["id"] for result in results] == sorted_ids

    # Verify that similarity scores in results match calculated scores
    for result in results:
        id = result["id"]
        index = ids.index(id)
        assert abs(result["score"] - (1.0 - similarity_scores[index])) < 0.01

    # Close the database connection
    await db.close()


@pytest.mark.asyncio
async def test_batch_vector_operations():
    """Test batch operations for vector search"""
    # Initialize VectorDatabase with test directory
    db = VectorDatabase(persist_directory=TEST_VECTOR_DB_DIR)

    # Create multiple sets of test embeddings
    num_sets = 3
    all_ids = []
    all_vectors = []
    all_metadatas = []
    all_texts = []

    for i in range(num_sets):
        ids, vectors, metadatas, texts = create_test_embeddings(count=5, dimension=384)
        all_ids.extend(ids)
        all_vectors.extend(vectors)
        all_metadatas.extend(metadatas)
        all_texts.extend(texts)

    # Add embeddings using batch operations
    await db.batch_add_embeddings(ids=all_ids, vectors=all_vectors, metadatas=all_metadatas, texts=all_texts)

    # Verify that all embeddings are added correctly
    count = await db.count_embeddings()
    assert count == num_sets * 5

    # Perform multiple searches in sequence
    num_searches = 3
    for i in range(num_searches):
        query_vector = all_vectors[i]
        results = await db.search_similar(query_vector=query_vector, limit=3)

        # Verify that all search results are correct
        assert len(results) == 3
        assert results[0]["id"] == all_ids[i]

    # Close the database connection
    await db.close()


@pytest.mark.asyncio
async def test_vector_search_edge_cases():
    """Test vector search with edge cases"""
    # Initialize VectorDatabase with test directory
    db = VectorDatabase(persist_directory=TEST_VECTOR_DB_DIR)

    # Test with empty database (should return empty results)
    query_vector = generate_random_embedding(dimension=384)
    results = await db.search_similar(query_vector=query_vector, limit=3)
    assert len(results) == 0

    # Create test embeddings
    ids, vectors, metadatas, texts = create_test_embeddings(count=5, dimension=384)

    # Add embeddings to the vector database
    for id, vector, metadata, text in zip(ids, vectors, metadatas, texts):
        await db.add_embedding(id=id, vector=vector, metadata=metadata, text=text)

    # Test with zero vector query (should handle gracefully)
    zero_vector = [0.0] * 384
    results = await db.search_similar(query_vector=zero_vector, limit=3)
    assert len(results) == 3

    # Test with very large vectors (if supported)
    large_vector = generate_random_embedding(dimension=1000)
    try:
        await db.add_embedding(id="large_vector", vector=large_vector, metadata={}, text="Large vector test")
    except Exception as e:
        print(f"Adding large vector not supported: {e}")

    # Test with invalid filter conditions (should handle gracefully)
    try:
        results = await db.search_similar(query_vector=vectors[0], limit=3, filters={"invalid_key": "invalid_value"})
    except Exception as e:
        print(f"Invalid filter conditions not supported: {e}")

    # Test with extremely high limit (should handle gracefully)
    results = await db.search_similar(query_vector=vectors[0], limit=1000)
    assert len(results) <= 5

    # Close the database connection
    await db.close()