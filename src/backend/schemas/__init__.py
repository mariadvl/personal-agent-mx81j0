# Import all models from individual schema files
from .conversation import *
from .memory import *
from .document import *
from .web import *
from .search import *
from .voice import *
from .settings import *

# Define __all__ to specify what gets imported with "from schemas import *"
__all__ = [
    # Conversation schemas
    'MessageBase', 'MessageCreate', 'MessageResponse',
    'ConversationBase', 'ConversationCreate', 'ConversationResponse',
    'ConversationMessageRequest', 'ConversationMessageResponse',
    # Memory schemas
    'MEMORY_CATEGORIES', 'MemoryBase', 'MemoryCreate', 'MemoryResponse',
    'MemorySearchRequest', 'MemorySearchResponse', 'MemoryUpdateRequest',
    'MemoryDeleteResponse', 'ContextRetrievalRequest', 'ContextRetrievalResponse',
    # Document schemas
    'ALLOWED_FILE_TYPES', 'DocumentBase', 'DocumentCreate', 'DocumentResponse',
    'DocumentProcessRequest', 'DocumentProcessResponse', 'DocumentUploadResponse',
    'DocumentChunk',
    # Web schemas
    'MAX_CONTENT_LENGTH', 'WebExtractionRequest', 'WebExtractionResponse',
    'WebPage', 'WebContentChunk', 'WebMemoryRequest', 'WebMemoryResponse',
    'WebSummaryRequest', 'WebSummaryResponse',
    # Search schemas
    'SEARCH_PROVIDERS', 'DEFAULT_NUM_RESULTS', 'MAX_NUM_RESULTS',
    'SearchRequest', 'SearchResultItem', 'SearchResponse',
    'SearchSummaryRequest', 'SearchSummaryResponse',
    'SearchMemoryRequest', 'SearchMemoryResponse',
    # Voice schemas
    'TranscriptionRequest', 'TranscriptionResponse',
    'SynthesisRequest', 'SynthesisResponse',
    'VoiceListRequest', 'VoiceInfo', 'VoiceListResponse',
    # Settings schemas
    'VoiceSettings', 'PersonalitySettings', 'PrivacySettings',
    'StorageSettings', 'LLMSettings', 'SearchSettings',
    'MemorySettings', 'UserSettings'
]