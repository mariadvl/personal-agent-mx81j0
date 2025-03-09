import re
import logging
from typing import List, Dict, Optional, Union, Any
import nltk
from nltk.tokenize import sent_tokenize, word_tokenize
from bs4 import BeautifulSoup
import tiktoken
import html2text
from readability import Document as ReadabilityDocument

from ..config.settings import Settings

# Configure logger
logger = logging.getLogger(__name__)

# Initialize settings
settings = Settings()

# Default constants
DEFAULT_CHUNK_SIZE = 1000
DEFAULT_CHUNK_OVERLAP = 100
DEFAULT_TOKEN_ENCODING = "cl100k_base"

# HTML tags to remove
HTML_TAGS_TO_REMOVE = ['script', 'style', 'iframe', 'nav', 'footer', 'header', 'aside', 'form', 'noscript']

# Regex patterns
WHITESPACE_PATTERN = re.compile(r'\s+')
URL_PATTERN = re.compile(r'https?://\S+')

# Cache for tokenizers
_tokenizer_cache = {}

def clean_text(text: str, remove_urls: bool = False, normalize_whitespace: bool = True) -> str:
    """
    Cleans and normalizes text by removing extra whitespace, controlling line breaks, and optionally removing URLs.
    
    Args:
        text (str): Text to clean
        remove_urls (bool): Whether to remove URLs from the text
        normalize_whitespace (bool): Whether to replace multiple whitespace characters with a single space
    
    Returns:
        str: Cleaned text
    """
    if text is None or text == '':
        return ''
    
    # Replace multiple whitespace characters with a single space
    if normalize_whitespace:
        text = WHITESPACE_PATTERN.sub(' ', text)
    
    # Remove URLs if requested
    if remove_urls:
        text = URL_PATTERN.sub('', text)
    
    # Strip leading and trailing whitespace
    return text.strip()

def count_tokens(text: str, encoding_name: Optional[str] = None) -> int:
    """
    Counts the number of tokens in a text string using the specified encoding.
    
    Args:
        text (str): Text to count tokens in
        encoding_name (str, optional): Name of the encoding to use. Defaults to DEFAULT_TOKEN_ENCODING.
    
    Returns:
        int: Number of tokens in the text
    """
    if text is None or text == '':
        return 0
    
    encoding_name = encoding_name or DEFAULT_TOKEN_ENCODING
    
    try:
        # Get or create tokenizer
        tokenizer = _get_tokenizer(encoding_name)
        
        # Count tokens
        return len(tokenizer.encode(text))
    except Exception as e:
        logger.error(f"Error counting tokens: {str(e)}")
        # Fall back to approximate token count
        return _approximate_token_count(text)

def truncate_text_to_token_limit(text: str, max_tokens: int, encoding_name: Optional[str] = None) -> str:
    """
    Truncates text to fit within a specified token limit.
    
    Args:
        text (str): Text to truncate
        max_tokens (int): Maximum number of tokens allowed
        encoding_name (str, optional): Name of the encoding to use. Defaults to DEFAULT_TOKEN_ENCODING.
    
    Returns:
        str: Truncated text
    """
    if text is None or text == '':
        return ''
    
    # Check if text is already within token limit
    token_count = count_tokens(text, encoding_name)
    if token_count <= max_tokens:
        return text
    
    encoding_name = encoding_name or DEFAULT_TOKEN_ENCODING
    
    try:
        # Get or create tokenizer
        tokenizer = _get_tokenizer(encoding_name)
        
        # Encode text
        tokens = tokenizer.encode(text)
        
        # Truncate tokens
        truncated_tokens = tokens[:max_tokens]
        
        # Decode back to text
        return tokenizer.decode(truncated_tokens)
    except Exception as e:
        logger.error(f"Error truncating text: {str(e)}")
        
        # Fall back to approximate truncation by words
        words = text.split()
        estimated_ratio = max_tokens / token_count
        estimated_words = int(len(words) * estimated_ratio)
        
        return ' '.join(words[:estimated_words])

def split_text_by_sentences(text: str) -> List[str]:
    """
    Splits text into individual sentences using NLTK's sentence tokenizer.
    
    Args:
        text (str): Text to split
    
    Returns:
        List[str]: List of sentences
    """
    if text is None or text == '':
        return []
    
    try:
        # Use NLTK's sentence tokenizer
        sentences = sent_tokenize(text)
        
        # Clean each sentence
        sentences = [clean_text(sentence) for sentence in sentences]
        
        # Filter out empty sentences
        return [sentence for sentence in sentences if sentence]
    except Exception as e:
        logger.error(f"Error splitting text by sentences: {str(e)}")
        # Fall back to simple splitting by periods
        simple_sentences = text.split('.')
        return [s.strip() for s in simple_sentences if s.strip()]

def split_text_by_paragraphs(text: str) -> List[str]:
    """
    Splits text into paragraphs based on blank lines.
    
    Args:
        text (str): Text to split
    
    Returns:
        List[str]: List of paragraphs
    """
    if text is None or text == '':
        return []
    
    try:
        # Split by double line breaks to separate paragraphs
        paragraphs = re.split(r'\n\s*\n', text)
        
        # Clean each paragraph
        paragraphs = [clean_text(paragraph) for paragraph in paragraphs]
        
        # Filter out empty paragraphs
        return [paragraph for paragraph in paragraphs if paragraph]
    except Exception as e:
        logger.error(f"Error splitting text by paragraphs: {str(e)}")
        return [text]

def extract_text_from_html(html_content: str) -> str:
    """
    Extracts clean text from HTML content while preserving basic structure.
    
    Args:
        html_content (str): HTML content to extract text from
    
    Returns:
        str: Extracted text
    """
    if html_content is None or html_content == '':
        return ''
    
    try:
        # Parse HTML
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Remove unwanted tags
        for tag in HTML_TAGS_TO_REMOVE:
            for element in soup.find_all(tag):
                element.decompose()
        
        # Convert to markdown-like text
        h = html2text.HTML2Text()
        h.ignore_links = False
        h.ignore_images = False
        h.ignore_tables = False
        text = h.handle(str(soup))
        
        # Clean the extracted text
        return clean_text(text)
    except Exception as e:
        logger.error(f"Error extracting text from HTML: {str(e)}")
        
        # Fall back to simple text extraction
        try:
            if 'soup' in locals() and soup:
                return clean_text(soup.get_text())
        except:
            pass
        return ''

def extract_main_content(html_content: str) -> str:
    """
    Extracts the main content from a web page using readability algorithms.
    
    Args:
        html_content (str): HTML content to extract from
    
    Returns:
        str: Main content HTML
    """
    if html_content is None or html_content == '':
        return ''
    
    try:
        # Use readability to extract main content
        doc = ReadabilityDocument(html_content)
        content = doc.summary()
        
        return content
    except Exception as e:
        logger.error(f"Error extracting main content: {str(e)}")
        
        # Fall back to basic extraction
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            # Remove unwanted tags
            for tag in HTML_TAGS_TO_REMOVE:
                for element in soup.find_all(tag):
                    element.decompose()
            
            # Try to find content in common content containers
            for container in ['article', 'main', 'div.content', 'div.main']:
                content = soup.select_one(container)
                if content:
                    return str(content)
            
            # Fall back to body
            body = soup.body
            if body:
                return str(body)
        except Exception as nested_e:
            logger.error(f"Error in fallback extraction: {str(nested_e)}")
        
        return html_content

def merge_text_chunks(chunks: List[str], overlap: int) -> str:
    """
    Merges a list of text chunks back into a single text, handling overlaps.
    
    Args:
        chunks (List[str]): List of text chunks to merge
        overlap (int): Number of characters of overlap between chunks
    
    Returns:
        str: Merged text
    """
    if not chunks:
        return ''
    
    if len(chunks) == 1:
        return chunks[0]
    
    try:
        result = chunks[0]
        
        for i in range(1, len(chunks)):
            if overlap > 0 and len(result) >= overlap:
                # Find where the overlap begins in the result
                overlap_start = len(result) - overlap
                result += chunks[i][overlap:]
            else:
                # If there's no overlap or result is shorter than overlap, just append
                result += chunks[i]
        
        return result
    except Exception as e:
        logger.error(f"Error merging text chunks: {str(e)}")
        # Fall back to simple joining
        return ' '.join(chunks)

def _get_tokenizer(encoding_name: str) -> Any:
    """
    Gets or creates a tokenizer for the specified encoding.
    
    Args:
        encoding_name (str): Name of the encoding
    
    Returns:
        Any: Tokenizer object
    """
    global _tokenizer_cache
    
    if encoding_name not in _tokenizer_cache:
        try:
            _tokenizer_cache[encoding_name] = tiktoken.get_encoding(encoding_name)
        except Exception as e:
            logger.error(f"Error getting tokenizer for {encoding_name}: {str(e)}")
            raise
    
    return _tokenizer_cache[encoding_name]

def _approximate_token_count(text: str) -> int:
    """
    Approximates token count based on word count when tokenizer is unavailable.
    
    Args:
        text (str): Text to count tokens in
    
    Returns:
        int: Approximate token count
    """
    try:
        # Split text into words
        words = text.split()
        
        # A rough estimate: tokens are typically 0.75x to 1.3x the number of words,
        # with 1.3 being a conservative estimate for most use cases
        return int(len(words) * 1.3)
    except Exception as e:
        logger.error(f"Error approximating token count: {str(e)}")
        # Very rough fallback: average 4 characters per token
        return len(text) // 4

class TextChunker:
    """
    Class for splitting large text into smaller, manageable chunks with configurable overlap.
    """
    
    def __init__(self, chunk_size: int = DEFAULT_CHUNK_SIZE, 
                 chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
                 encoding_name: Optional[str] = None):
        """
        Initializes the TextChunker with chunk size and overlap settings.
        
        Args:
            chunk_size (int, optional): Maximum chunk size in tokens. Defaults to DEFAULT_CHUNK_SIZE.
            chunk_overlap (int, optional): Overlap between chunks in tokens. Defaults to DEFAULT_CHUNK_OVERLAP.
            encoding_name (str, optional): Name of the encoding to use. Defaults to DEFAULT_TOKEN_ENCODING.
        """
        self.chunk_size = chunk_size or DEFAULT_CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or DEFAULT_CHUNK_OVERLAP
        self.encoding_name = encoding_name or DEFAULT_TOKEN_ENCODING
        
        # Validate settings
        if self.chunk_size <= self.chunk_overlap:
            raise ValueError("Chunk size must be greater than chunk overlap")
        
        logger.info(f"Initialized TextChunker with chunk_size={self.chunk_size}, "
                   f"chunk_overlap={self.chunk_overlap}, encoding={self.encoding_name}")
    
    def split_text(self, text: str) -> List[str]:
        """
        Splits text into chunks based on token count with specified overlap.
        
        Args:
            text (str): Text to split
        
        Returns:
            List[str]: List of text chunks
        """
        if text is None or text == '':
            return []
        
        # Clean input text
        text = clean_text(text)
        
        try:
            # Get tokenizer
            tokenizer = _get_tokenizer(self.encoding_name)
            
            # Encode the text
            tokens = tokenizer.encode(text)
            
            # If tokens are fewer than chunk_size, return the whole text as a single chunk
            if len(tokens) <= self.chunk_size:
                return [text]
            
            # Calculate chunk step size (chunk_size - chunk_overlap)
            chunk_step = self.chunk_size - self.chunk_overlap
            
            # Split tokens into chunks
            token_chunks = []
            for i in range(0, len(tokens), chunk_step):
                end = min(i + self.chunk_size, len(tokens))
                token_chunks.append(tokens[i:end])
            
            # Decode token chunks back to text
            text_chunks = [tokenizer.decode(chunk) for chunk in token_chunks]
            
            return text_chunks
        except Exception as e:
            logger.error(f"Error splitting text by tokens: {str(e)}")
            # Fall back to semantic unit-based splitting
            return self.split_by_semantic_units(text)
    
    def split_by_semantic_units(self, text: str) -> List[str]:
        """
        Splits text into chunks based on semantic units (paragraphs, sentences) rather than token count.
        
        Args:
            text (str): Text to split
        
        Returns:
            List[str]: List of text chunks
        """
        if text is None or text == '':
            return []
        
        try:
            # Split text into paragraphs
            paragraphs = split_text_by_paragraphs(text)
            
            chunks = []
            current_chunk = ''
            
            for paragraph in paragraphs:
                # Calculate token count of current chunk + new paragraph
                potential_chunk = current_chunk + '\n\n' + paragraph if current_chunk else paragraph
                potential_tokens = count_tokens(potential_chunk, self.encoding_name)
                
                if potential_tokens > self.chunk_size and current_chunk:
                    # If adding paragraph would exceed chunk_size, add current chunk to chunks
                    chunks.append(current_chunk)
                    
                    # Start new chunk with overlap
                    if self.chunk_overlap > 0:
                        # Get the last part of the previous chunk for overlap
                        sentences = split_text_by_sentences(current_chunk)
                        overlap_text = ''
                        overlap_tokens = 0
                        
                        # Build overlap from the end of the previous chunk
                        for sentence in reversed(sentences):
                            sentence_tokens = count_tokens(sentence, self.encoding_name)
                            if overlap_tokens + sentence_tokens <= self.chunk_overlap:
                                overlap_text = sentence + ' ' + overlap_text
                                overlap_tokens += sentence_tokens
                            else:
                                break
                        
                        current_chunk = overlap_text.strip() + '\n\n' + paragraph
                    else:
                        current_chunk = paragraph
                else:
                    current_chunk = potential_chunk
            
            # Add the last chunk if it's not empty
            if current_chunk:
                chunks.append(current_chunk)
            
            return chunks
        except Exception as e:
            logger.error(f"Error splitting text by semantic units: {str(e)}")
            
            # Very basic fallback: split by a fixed number of characters
            chunks = []
            approximate_char_per_token = 4  # rough estimate
            char_chunk_size = self.chunk_size * approximate_char_per_token
            char_chunk_overlap = self.chunk_overlap * approximate_char_per_token
            
            for i in range(0, len(text), char_chunk_size - char_chunk_overlap):
                end = min(i + char_chunk_size, len(text))
                chunks.append(text[i:end])
            
            return chunks
    
    def split_document(self, document_text: str, metadata: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """
        Splits a document into chunks, preserving document structure where possible.
        
        Args:
            document_text (str): Document text to split
            metadata (Dict[str, Any], optional): Metadata to include with each chunk
        
        Returns:
            List[Dict[str, Any]]: List of chunks with metadata
        """
        if document_text is None or document_text == '':
            return []
        
        try:
            # Split document into chunks
            text_chunks = self.split_text(document_text)
            
            # Create chunk dictionaries with metadata
            chunks = []
            metadata = metadata or {}
            
            for i, chunk in enumerate(text_chunks):
                chunk_dict = {
                    'text': chunk,
                    'chunk_index': i,
                    'total_chunks': len(text_chunks),
                    **metadata
                }
                chunks.append(chunk_dict)
            
            return chunks
        except Exception as e:
            logger.error(f"Error splitting document: {str(e)}")
            return []

class TextSummarizer:
    """
    Class for generating summaries of text content using extractive or abstractive methods.
    """
    
    def __init__(self, options: Optional[Dict[str, Any]] = None):
        """
        Initializes the TextSummarizer with configuration options.
        
        Args:
            options (Dict[str, Any], optional): Configuration options
        """
        self.options = options or {}
        self.max_summary_length = self.options.get('max_summary_length', 200)
        self.summarization_method = self.options.get('summarization_method', 'extractive')
        
        logger.info(f"Initialized TextSummarizer with max_length={self.max_summary_length}, "
                   f"method={self.summarization_method}")
    
    def summarize(self, text: str, max_length: Optional[int] = None, 
                  method: Optional[str] = None) -> str:
        """
        Generates a summary of the provided text using the configured method.
        
        Args:
            text (str): Text to summarize
            max_length (int, optional): Maximum length of summary in tokens. Defaults to configured value.
            method (str, optional): Summarization method ('extractive' or 'abstractive'). 
                                    Defaults to configured value.
        
        Returns:
            str: Generated summary
        """
        if text is None or text == '':
            return ''
        
        max_length = max_length or self.max_summary_length
        method = method or self.summarization_method
        
        try:
            if method == 'extractive':
                return self.extractive_summarize(text, max_length)
            elif method == 'abstractive':
                return self.abstractive_summarize(text, max_length)
            else:
                logger.warning(f"Unknown summarization method: {method}. Using extractive method.")
                return self.extractive_summarize(text, max_length)
        except Exception as e:
            logger.error(f"Error summarizing text: {str(e)}")
            
            # Fallback: return the first few sentences
            sentences = split_text_by_sentences(text)
            summary_length = 0
            summary_sentences = []
            
            for sentence in sentences:
                sentence_length = count_tokens(sentence)
                if summary_length + sentence_length <= max_length:
                    summary_sentences.append(sentence)
                    summary_length += sentence_length
                else:
                    break
            
            return ' '.join(summary_sentences)
    
    def extractive_summarize(self, text: str, max_length: int) -> str:
        """
        Generates a summary by extracting key sentences from the text.
        
        Args:
            text (str): Text to summarize
            max_length (int): Maximum length of summary in tokens
        
        Returns:
            str: Extractive summary
        """
        try:
            # Split text into sentences
            sentences = split_text_by_sentences(text)
            
            if not sentences:
                return ''
            
            if len(sentences) == 1 or count_tokens(' '.join(sentences)) <= max_length:
                return ' '.join(sentences)
            
            # Basic frequency-based scoring
            word_frequencies = {}
            
            # Count word frequencies (excluding stop words)
            for sentence in sentences:
                words = word_tokenize(sentence.lower())
                
                for word in words:
                    if word.isalnum():  # Simple filtering of punctuation
                        word_frequencies[word] = word_frequencies.get(word, 0) + 1
            
            # Calculate max frequency for normalization
            max_frequency = max(word_frequencies.values()) if word_frequencies else 1
            
            # Normalize frequencies
            for word in word_frequencies:
                word_frequencies[word] = word_frequencies[word] / max_frequency
            
            # Score sentences based on word frequencies
            sentence_scores = {}
            for i, sentence in enumerate(sentences):
                words = word_tokenize(sentence.lower())
                score = sum(word_frequencies.get(word, 0) for word in words if word.isalnum())
                
                # Normalize by sentence length to avoid bias towards longer sentences
                normalized_score = score / max(1, len(words))
                
                # Boost score of early sentences (position importance)
                position_boost = 1.0 if i < len(sentences) / 3 else 0.8
                
                sentence_scores[i] = normalized_score * position_boost
            
            # Select top sentences
            selected_indices = []
            selected_tokens = 0
            
            # Sort sentence indices by score (descending)
            sorted_indices = sorted(sentence_scores.keys(), key=lambda i: sentence_scores[i], reverse=True)
            
            for i in sorted_indices:
                sentence = sentences[i]
                sentence_tokens = count_tokens(sentence)
                
                if selected_tokens + sentence_tokens <= max_length:
                    selected_indices.append(i)
                    selected_tokens += sentence_tokens
                else:
                    break
            
            # Sort selected indices by position (not score) to maintain document flow
            selected_indices.sort()
            
            # Build summary from selected sentences
            summary = ' '.join(sentences[i] for i in selected_indices)
            
            return summary
        except Exception as e:
            logger.error(f"Error in extractive summarization: {str(e)}")
            # Fallback to first few sentences
            return truncate_text_to_token_limit(text, max_length)
    
    def abstractive_summarize(self, text: str, max_length: int) -> str:
        """
        Generates a summary by creating new text that captures the essence of the original.
        Note: Requires an LLM to generate the summary, will fall back to extractive if not available.
        
        Args:
            text (str): Text to summarize
            max_length (int): Maximum length of summary in tokens
        
        Returns:
            str: Abstractive summary
        """
        try:
            # This method requires an LLM to generate abstractive summaries
            # In a full implementation, this would call the LLM service
            # For now, just note that we would need to do this and fall back to extractive
            
            logger.info("Abstractive summarization requested but not implemented. Falling back to extractive.")
            return self.extractive_summarize(text, max_length)
        except Exception as e:
            logger.error(f"Error in abstractive summarization: {str(e)}")
            return self.extractive_summarize(text, max_length)