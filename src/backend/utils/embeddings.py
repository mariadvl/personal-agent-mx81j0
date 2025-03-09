import logging
import numpy as np
from typing import List, Dict, Optional, Union, Any

from ..config.settings import Settings
from ..integrations.openai_client import OpenAIClient

# Configure logger
logger = logging.getLogger(__name__)

# Initialize settings
settings = Settings()

# Default models
DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small"
DEFAULT_LOCAL_EMBEDDING_MODEL = "all-MiniLM-L6-v2"

# Embedding dimensions for different models
EMBEDDING_DIMENSIONS = {
    "text-embedding-3-small": 1536,
    "text-embedding-3-large": 3072,
    "all-MiniLM-L6-v2": 384,
    "bge-small-en-v1.5": 384
}

# Module-level caches to avoid repeated initialization
_openai_client = None
_local_embedding_model = None


def get_embedding_model(use_local: Optional[bool] = None) -> str:
    """
    Gets the appropriate embedding model based on settings.
    
    Args:
        use_local: Override settings to use local model if True, or OpenAI if False
        
    Returns:
        Name of the embedding model to use
    """
    # Determine whether to use local model
    if use_local is None:
        use_local = settings.get('llm.use_local_embeddings', False)
    
    # Return appropriate model name
    if use_local:
        model_name = settings.get('llm.local_embedding_model', DEFAULT_LOCAL_EMBEDDING_MODEL)
        logger.debug(f"Using local embedding model: {model_name}")
        return model_name
    else:
        model_name = settings.get('llm.embedding_model', DEFAULT_EMBEDDING_MODEL)
        logger.debug(f"Using OpenAI embedding model: {model_name}")
        return model_name


def get_embedding_dimension(model_name: str) -> int:
    """
    Gets the dimension of the specified embedding model.
    
    Args:
        model_name: Name of the embedding model
        
    Returns:
        Dimension of the embedding model
    """
    dimension = EMBEDDING_DIMENSIONS.get(model_name)
    if dimension is None:
        logger.warning(f"Unknown embedding model: {model_name}. Using default dimension of 384.")
        return 384
    return dimension


def generate_embedding(text: str, model_name: Optional[str] = None, use_local: Optional[bool] = None) -> List[float]:
    """
    Generates an embedding vector for the given text.
    
    Args:
        text: Text to generate embedding for
        model_name: Specific model to use for embedding generation
        use_local: Override settings to use local model if True, or OpenAI if False
        
    Returns:
        Embedding vector as a list of floats
    """
    if not text or not isinstance(text, str):
        logger.error("Invalid input: text must be a non-empty string")
        return []
    
    # Determine whether to use local model
    if use_local is None:
        use_local = settings.get('llm.use_local_embeddings', False)
    
    # If model_name is not provided, get appropriate model based on settings
    if model_name is None:
        model_name = get_embedding_model(use_local)
    
    try:
        if use_local:
            return _generate_local_embedding(text, model_name)
        else:
            return _generate_openai_embedding(text, model_name)
    except Exception as e:
        logger.error(f"Error generating embedding: {str(e)}")
        
        # If OpenAI failed, try falling back to local model
        if not use_local:
            logger.info("Falling back to local embedding model")
            try:
                return _generate_local_embedding(text, DEFAULT_LOCAL_EMBEDDING_MODEL)
            except Exception as e2:
                logger.error(f"Error generating fallback embedding: {str(e2)}")
        
        # Return empty list if all attempts failed
        return []


def _generate_openai_embedding(text: str, model_name: str) -> List[float]:
    """
    Generates an embedding using OpenAI API.
    
    Args:
        text: Text to generate embedding for
        model_name: OpenAI embedding model to use
        
    Returns:
        OpenAI embedding vector
    """
    global _openai_client
    
    try:
        # Initialize OpenAI client if not already initialized
        if _openai_client is None:
            _openai_client = _initialize_openai_client()
        
        # Generate embedding
        embedding = _openai_client.generate_embeddings(text, model_name)
        return embedding
    except Exception as e:
        logger.error(f"Error generating OpenAI embedding: {str(e)}")
        raise


def _generate_local_embedding(text: str, model_name: str) -> List[float]:
    """
    Generates an embedding using local models.
    
    Args:
        text: Text to generate embedding for
        model_name: Local embedding model to use
        
    Returns:
        Local embedding vector
    """
    global _local_embedding_model
    
    try:
        # Initialize local embedding model if not already initialized or if model changed
        if _local_embedding_model is None or getattr(_local_embedding_model, "_model_name", "") != model_name:
            _local_embedding_model = _initialize_local_model(model_name)
        
        # Generate embedding
        embedding = _local_embedding_model.encode(text)
        
        # Convert numpy array to list
        if isinstance(embedding, np.ndarray):
            return embedding.tolist()
        
        return list(embedding)
    except Exception as e:
        logger.error(f"Error generating local embedding: {str(e)}")
        raise


def _initialize_openai_client() -> OpenAIClient:
    """
    Initializes the OpenAI client for embeddings.
    
    Returns:
        Initialized OpenAI client
    """
    try:
        # Get API key from settings
        api_key = settings.get_secret('openai_api_key')
        if not api_key:
            raise ValueError("OpenAI API key not found in settings")
        
        # Create client
        client = OpenAIClient(api_key, embedding_model=DEFAULT_EMBEDDING_MODEL)
        logger.info("OpenAI client initialized for embeddings")
        return client
    except Exception as e:
        logger.error(f"Error initializing OpenAI client: {str(e)}")
        raise


def _initialize_local_model(model_name: str) -> Any:
    """
    Initializes the local embedding model.
    
    Args:
        model_name: Name of the model to initialize
        
    Returns:
        Initialized sentence transformer model
    """
    try:
        # Import SentenceTransformer here to avoid loading it when using OpenAI
        from sentence_transformers import SentenceTransformer
        
        # Create model
        model = SentenceTransformer(model_name)
        
        # Store model name for reference
        setattr(model, "_model_name", model_name)
        
        logger.info(f"Local embedding model '{model_name}' initialized")
        return model
    except Exception as e:
        logger.error(f"Error initializing local embedding model: {str(e)}")
        raise


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Calculates cosine similarity between two embedding vectors.
    
    Args:
        vec1: First embedding vector
        vec2: Second embedding vector
        
    Returns:
        Similarity score between 0 and 1
    """
    try:
        if not vec1 or not vec2:
            return 0.0
        
        # Convert to numpy arrays
        a = np.array(vec1)
        b = np.array(vec2)
        
        # Check for zero vectors
        a_norm = np.linalg.norm(a)
        b_norm = np.linalg.norm(b)
        
        if a_norm == 0 or b_norm == 0:
            return 0.0
        
        # Calculate cosine similarity
        similarity = np.dot(a, b) / (a_norm * b_norm)
        
        # Ensure result is in valid range
        return float(max(0.0, min(1.0, similarity)))
    except Exception as e:
        logger.error(f"Error calculating cosine similarity: {str(e)}")
        return 0.0


def batch_generate_embeddings(texts: List[str], model_name: Optional[str] = None, 
                              use_local: Optional[bool] = None) -> List[List[float]]:
    """
    Generates embeddings for multiple texts in batch.
    
    Args:
        texts: List of texts to generate embeddings for
        model_name: Specific model to use for embedding generation
        use_local: Override settings to use local model if True, or OpenAI if False
        
    Returns:
        List of embedding vectors
    """
    if not texts:
        logger.error("Invalid input: texts list is empty")
        return []
    
    # Determine whether to use local model
    if use_local is None:
        use_local = settings.get('llm.use_local_embeddings', False)
    
    # If model_name is not provided, get appropriate model based on settings
    if model_name is None:
        model_name = get_embedding_model(use_local)
    
    try:
        if use_local:
            return _batch_generate_local_embeddings(texts, model_name)
        else:
            return _batch_generate_openai_embeddings(texts, model_name)
    except Exception as e:
        logger.error(f"Error generating batch embeddings: {str(e)}")
        
        # If OpenAI failed, try falling back to local model
        if not use_local:
            logger.info("Falling back to local embedding model for batch processing")
            try:
                return _batch_generate_local_embeddings(texts, DEFAULT_LOCAL_EMBEDDING_MODEL)
            except Exception as e2:
                logger.error(f"Error generating fallback batch embeddings: {str(e2)}")
        
        # Return empty list if all attempts failed
        return []


def _batch_generate_openai_embeddings(texts: List[str], model_name: str) -> List[List[float]]:
    """
    Generates embeddings for multiple texts using OpenAI API.
    
    Args:
        texts: List of texts to generate embeddings for
        model_name: OpenAI embedding model to use
        
    Returns:
        List of OpenAI embedding vectors
    """
    global _openai_client
    
    try:
        # Initialize OpenAI client if not already initialized
        if _openai_client is None:
            _openai_client = _initialize_openai_client()
        
        # Generate embeddings
        embeddings = _openai_client.generate_embeddings(texts, model_name)
        return embeddings
    except Exception as e:
        logger.error(f"Error generating batch OpenAI embeddings: {str(e)}")
        raise


def _batch_generate_local_embeddings(texts: List[str], model_name: str) -> List[List[float]]:
    """
    Generates embeddings for multiple texts using local models.
    
    Args:
        texts: List of texts to generate embeddings for
        model_name: Local embedding model to use
        
    Returns:
        List of local embedding vectors
    """
    global _local_embedding_model
    
    try:
        # Initialize local embedding model if not already initialized or if model changed
        if _local_embedding_model is None or getattr(_local_embedding_model, "_model_name", "") != model_name:
            _local_embedding_model = _initialize_local_model(model_name)
        
        # Generate embeddings
        embeddings = _local_embedding_model.encode(texts)
        
        # Convert numpy arrays to lists
        if isinstance(embeddings, np.ndarray):
            return embeddings.tolist()
        
        return [embedding.tolist() if isinstance(embedding, np.ndarray) else list(embedding) 
                for embedding in embeddings]
    except Exception as e:
        logger.error(f"Error generating batch local embeddings: {str(e)}")
        raise