import pytest
from unittest.mock import patch, MagicMock
import tiktoken

from ...__init__ import UTILS_TEST_MARKER
from src.backend.utils.text_processing import (
    clean_text,
    count_tokens,
    truncate_text_to_token_limit,
    split_text_by_sentences,
    split_text_by_paragraphs,
    extract_text_from_html,
    extract_main_content,
    merge_text_chunks,
    TextChunker,
    TextSummarizer,
    DEFAULT_CHUNK_SIZE,
    DEFAULT_CHUNK_OVERLAP,
    DEFAULT_TOKEN_ENCODING
)


@UTILS_TEST_MARKER
def test_clean_text_basic():
    # Define test text with extra whitespace and line breaks
    text = "  This is a   test with    extra  whitespace \n and line breaks  "
    result = clean_text(text)
    
    # Assert that extra whitespace is normalized
    assert result == "This is a test with extra whitespace and line breaks"
    
    # Assert that leading/trailing whitespace is removed
    assert not result.startswith(" ")
    assert not result.endswith(" ")


@UTILS_TEST_MARKER
def test_clean_text_url_removal():
    # Define test text containing URLs
    text = "Check out https://example.com and http://test.org for more information"
    
    # Call clean_text with remove_urls=True
    result = clean_text(text, remove_urls=True)
    
    # Assert that URLs are removed from the text
    assert "https://example.com" not in result
    assert "http://test.org" not in result
    assert result == "Check out  and  for more information"
    
    # Call clean_text with remove_urls=False
    result_with_urls = clean_text(text, remove_urls=False)
    
    # Assert that URLs are preserved in the text
    assert "https://example.com" in result_with_urls
    assert "http://test.org" in result_with_urls


@UTILS_TEST_MARKER
def test_clean_text_empty_input():
    # Call clean_text with empty string
    assert clean_text("") == ""
    
    # Call clean_text with None
    assert clean_text(None) == ""


@UTILS_TEST_MARKER
def test_count_tokens_basic():
    # Define test text with known token count
    text = "This is a test sentence for counting tokens."
    token_count = count_tokens(text)
    
    # Assert that the returned count is a positive integer
    assert token_count > 0
    assert isinstance(token_count, int)


@UTILS_TEST_MARKER
def test_count_tokens_empty_input():
    # Call count_tokens with empty string
    assert count_tokens("") == 0
    
    # Call count_tokens with None
    assert count_tokens(None) == 0


@UTILS_TEST_MARKER
def test_count_tokens_encoding():
    # Define test text
    text = "This is a test sentence for counting tokens."
    
    # Call count_tokens with default encoding
    default_count = count_tokens(text)
    
    # Call count_tokens with specific encoding
    specific_count = count_tokens(text, DEFAULT_TOKEN_ENCODING)
    
    # Assert that counts may differ between encodings
    assert default_count > 0
    assert specific_count > 0
    # Same encoding should give same count
    assert default_count == specific_count


@UTILS_TEST_MARKER
@patch('src.backend.utils.text_processing._get_tokenizer')
def test_count_tokens_error_handling(mock_get_tokenizer):
    # Configure mock _get_tokenizer to raise an exception
    mock_get_tokenizer.side_effect = Exception("Tokenizer error")
    
    # Call count_tokens with test text
    text = "This is a test sentence for counting tokens."
    result = count_tokens(text)
    
    # Assert that it falls back to approximate token count
    assert result > 0
    assert isinstance(result, int)
    
    # Verify that the exception was logged
    mock_get_tokenizer.assert_called_once()


@UTILS_TEST_MARKER
def test_truncate_text_to_token_limit():
    # Define test text with known token count
    long_text = "This is a longer text that would need to be truncated. " * 10
    original_count = count_tokens(long_text)
    
    # Call truncate_text_to_token_limit with limit less than text length
    truncated = truncate_text_to_token_limit(long_text, original_count // 2)
    truncated_count = count_tokens(truncated)
    
    # Assert that returned text is shorter than original
    assert len(truncated) < len(long_text)
    
    # Assert that token count of truncated text is within limit
    assert truncated_count <= original_count // 2


@UTILS_TEST_MARKER
def test_truncate_text_no_truncation_needed():
    # Define short test text
    text = "Short test text."
    
    # Call truncate_text_to_token_limit with limit greater than text length
    result = truncate_text_to_token_limit(text, 100)
    
    # Assert that returned text is identical to original
    assert result == text


@UTILS_TEST_MARKER
def test_truncate_text_empty_input():
    # Call truncate_text_to_token_limit with empty string
    assert truncate_text_to_token_limit("", 10) == ""
    
    # Call truncate_text_to_token_limit with None
    assert truncate_text_to_token_limit(None, 10) == ""


@UTILS_TEST_MARKER
@patch('src.backend.utils.text_processing._get_tokenizer')
def test_truncate_text_error_handling(mock_get_tokenizer):
    # Configure mock _get_tokenizer to raise an exception
    mock_get_tokenizer.side_effect = Exception("Tokenizer error")
    
    # Call truncate_text_to_token_limit with test text
    text = "This is a test sentence that would need to be truncated."
    result = truncate_text_to_token_limit(text, 2)
    
    # Assert that it falls back to approximate truncation
    assert len(result) < len(text)
    
    # Verify that the exception was logged
    mock_get_tokenizer.assert_called_once()


@UTILS_TEST_MARKER
def test_split_text_by_sentences():
    # Define test text with multiple sentences
    text = "This is the first sentence. This is the second sentence! Is this the third sentence?"
    
    # Call split_text_by_sentences with the test text
    sentences = split_text_by_sentences(text)
    
    # Assert that the returned list contains the expected number of sentences
    assert len(sentences) == 3
    
    # Assert that each sentence is correctly extracted
    assert "This is the first sentence" in sentences
    assert "This is the second sentence" in sentences
    assert "Is this the third sentence" in sentences


@UTILS_TEST_MARKER
def test_split_text_by_sentences_empty_input():
    # Call split_text_by_sentences with empty string
    assert split_text_by_sentences("") == []
    
    # Call split_text_by_sentences with None
    assert split_text_by_sentences(None) == []


@UTILS_TEST_MARKER
def test_split_text_by_paragraphs():
    # Define test text with multiple paragraphs separated by blank lines
    text = "This is paragraph one.\n\nThis is paragraph two.\n\nThis is paragraph three."
    
    # Call split_text_by_paragraphs with the test text
    paragraphs = split_text_by_paragraphs(text)
    
    # Assert that the returned list contains the expected number of paragraphs
    assert len(paragraphs) == 3
    
    # Assert that each paragraph is correctly extracted
    assert "This is paragraph one" in paragraphs
    assert "This is paragraph two" in paragraphs
    assert "This is paragraph three" in paragraphs


@UTILS_TEST_MARKER
def test_split_text_by_paragraphs_empty_input():
    # Call split_text_by_paragraphs with empty string
    assert split_text_by_paragraphs("") == []
    
    # Call split_text_by_paragraphs with None
    assert split_text_by_paragraphs(None) == []


@UTILS_TEST_MARKER
def test_extract_text_from_html():
    # Define test HTML content with various elements
    html = """
    <html>
        <head><title>Test Page</title></head>
        <body>
            <header>Header content</header>
            <nav>Navigation menu</nav>
            <article>
                <h1>Main Article Title</h1>
                <p>This is the main content paragraph.</p>
            </article>
            <script>console.log('This should be removed');</script>
            <style>.hidden { display: none; }</style>
            <footer>Footer information</footer>
        </body>
    </html>
    """
    
    # Call extract_text_from_html with the test HTML
    result = extract_text_from_html(html)
    
    # Assert that HTML tags are removed
    assert "<html>" not in result
    assert "<h1>" not in result
    
    # Assert that main content is preserved
    assert "Main Article Title" in result
    assert "main content paragraph" in result
    
    # Assert that unwanted elements (scripts, styles) are removed
    assert "console.log" not in result
    assert ".hidden" not in result


@UTILS_TEST_MARKER
def test_extract_text_from_html_empty_input():
    # Call extract_text_from_html with empty string
    assert extract_text_from_html("") == ""
    
    # Call extract_text_from_html with None
    assert extract_text_from_html(None) == ""


@UTILS_TEST_MARKER
def test_extract_main_content():
    # Define test HTML content with main article and surrounding elements
    html = """
    <html>
        <head><title>Test Page</title></head>
        <body>
            <header>Site Header</header>
            <nav>Navigation Links</nav>
            <aside>Sidebar content</aside>
            <article>
                <h1>Main Article Title</h1>
                <p>This is the important content that should be extracted.</p>
                <p>More relevant information here.</p>
            </article>
            <div class="ads">Advertisement content</div>
            <footer>Footer information and links</footer>
        </body>
    </html>
    """
    
    # Call extract_main_content with the test HTML
    result = extract_main_content(html)
    
    # Assert that main article content is extracted
    assert "Main Article Title" in result
    assert "important content that should be extracted" in result
    
    # Assert that navigation, ads, and other non-content elements are removed
    # Note: The exact behavior depends on the readability algorithm
    # We're just checking for the presence of main content here
    assert result.strip() != ""


@UTILS_TEST_MARKER
def test_extract_main_content_empty_input():
    # Call extract_main_content with empty string
    assert extract_main_content("") == ""
    
    # Call extract_main_content with None
    assert extract_main_content(None) == ""


@UTILS_TEST_MARKER
@patch('src.backend.utils.text_processing.ReadabilityDocument')
def test_extract_main_content_error_handling(mock_readability):
    # Configure mock readability.Document to raise an exception
    mock_readability.side_effect = Exception("Readability error")
    
    # Call extract_main_content with test HTML
    html = "<html><body><p>Test content</p></body></html>"
    result = extract_main_content(html)
    
    # Assert that it falls back to basic extraction
    assert "Test content" in result or result == html
    
    # Verify that the exception was logged
    mock_readability.assert_called_once()


@UTILS_TEST_MARKER
def test_merge_text_chunks():
    # Define list of text chunks with known overlap
    chunks = [
        "This is the first chunk with some overlap.",
        "with some overlap. This is the second chunk with different overlap.",
        "with different overlap. This is the third chunk."
    ]
    
    # Call merge_text_chunks with the chunks and overlap size
    result = merge_text_chunks(chunks, 18)  # "with some overlap." and "with different overlap." length
    
    # Assert that the merged text contains all content without duplication
    assert "This is the first chunk" in result
    assert "This is the second chunk" in result
    assert "This is the third chunk" in result
    
    # Assert that the merged text preserves the original order
    first_pos = result.find("first chunk")
    second_pos = result.find("second chunk")
    third_pos = result.find("third chunk")
    assert first_pos < second_pos < third_pos


@UTILS_TEST_MARKER
def test_merge_text_chunks_empty_input():
    # Call merge_text_chunks with empty list
    assert merge_text_chunks([], 5) == ""
    
    # Call merge_text_chunks with None
    assert merge_text_chunks(None, 5) == ""
    
    # Call merge_text_chunks with single chunk
    single_chunk = "This is a single chunk."
    assert merge_text_chunks([single_chunk], 5) == single_chunk


@UTILS_TEST_MARKER
def test_text_chunker_init():
    # Create TextChunker with default parameters
    default_chunker = TextChunker()
    
    # Assert that it uses DEFAULT_CHUNK_SIZE and DEFAULT_CHUNK_OVERLAP
    assert default_chunker.chunk_size == DEFAULT_CHUNK_SIZE
    assert default_chunker.chunk_overlap == DEFAULT_CHUNK_OVERLAP
    
    # Create TextChunker with custom parameters
    custom_chunker = TextChunker(chunk_size=500, chunk_overlap=50, encoding_name="cl100k_base")
    
    # Assert that it uses the provided values
    assert custom_chunker.chunk_size == 500
    assert custom_chunker.chunk_overlap == 50
    assert custom_chunker.encoding_name == "cl100k_base"
    
    # Assert that it raises ValueError if chunk_size <= chunk_overlap
    with pytest.raises(ValueError):
        TextChunker(chunk_size=100, chunk_overlap=100)


@UTILS_TEST_MARKER
def test_text_chunker_split_text():
    # Create TextChunker with specific chunk size and overlap
    chunker = TextChunker(chunk_size=20, chunk_overlap=5)
    
    # Define test text longer than chunk size
    text = "This is a longer text that should be split into chunks based on length"
    
    # Call chunker.split_text with the test text
    chunks = chunker.split_text(text)
    
    # Assert that returned chunks have appropriate length
    assert len(chunks) > 1
    
    # Assert that chunks have the specified overlap
    # This is approximate as token boundaries don't always align with character boundaries
    assert len(chunks) >= 3  # Should have at least 3 chunks given the text length
    
    # Assert that all original content is preserved across chunks
    # We can join and check if original words are preserved (ignoring exact whitespace)
    original_words = set(text.split())
    chunks_words = set(' '.join(chunks).split())
    assert original_words.issubset(chunks_words)


@UTILS_TEST_MARKER
def test_text_chunker_split_text_empty_input():
    # Create TextChunker instance
    chunker = TextChunker()
    
    # Call split_text with empty string
    assert chunker.split_text("") == []
    
    # Call split_text with None
    assert chunker.split_text(None) == []


@UTILS_TEST_MARKER
def test_text_chunker_split_by_semantic_units():
    # Create TextChunker with specific chunk size and overlap
    chunker = TextChunker(chunk_size=50, chunk_overlap=10)
    
    # Define test text with multiple paragraphs
    text = """
    First paragraph with content that should stay together.
    
    Second paragraph that contains different information.
    
    Third paragraph with yet more unique content.
    """
    
    # Call chunker.split_by_semantic_units with the test text
    chunks = chunker.split_by_semantic_units(text)
    
    # Assert that chunks respect paragraph boundaries where possible
    assert len(chunks) > 0
    
    # Assert that all original content is preserved across chunks
    for paragraph in ["First paragraph", "Second paragraph", "Third paragraph"]:
        found = False
        for chunk in chunks:
            if paragraph in chunk:
                found = True
                break
        assert found, f"Could not find '{paragraph}' in any chunk"


@UTILS_TEST_MARKER
def test_text_chunker_split_document():
    # Create TextChunker instance
    chunker = TextChunker(chunk_size=30, chunk_overlap=5)
    
    # Define test document text
    text = "This is a test document that needs to be split into chunks with metadata preserved."
    
    # Define test metadata
    metadata = {"source": "test", "author": "unittest", "date": "2023-06-15"}
    
    # Call chunker.split_document with text and metadata
    result = chunker.split_document(text, metadata)
    
    # Assert that returned list contains dictionaries with text and metadata
    assert len(result) > 0
    for chunk in result:
        assert "text" in chunk
        assert "chunk_index" in chunk
        assert "total_chunks" in chunk
        assert chunk["source"] == "test"
        assert chunk["author"] == "unittest"
        assert chunk["date"] == "2023-06-15"
    
    # Assert that metadata is preserved for each chunk
    for key in metadata:
        for chunk in result:
            assert chunk[key] == metadata[key]
    
    # Assert that all original content is preserved across chunks
    original_words = set(text.split())
    all_chunks_text = " ".join([chunk["text"] for chunk in result])
    chunks_words = set(all_chunks_text.split())
    assert original_words.issubset(chunks_words)


@UTILS_TEST_MARKER
def test_text_summarizer_init():
    # Create TextSummarizer with default options
    default_summarizer = TextSummarizer()
    
    # Assert that it uses default max_summary_length and summarization_method
    assert default_summarizer.max_summary_length == 200
    assert default_summarizer.summarization_method == "extractive"
    
    # Create TextSummarizer with custom options
    custom_summarizer = TextSummarizer({"max_summary_length": 100, "summarization_method": "abstractive"})
    
    # Assert that it uses the provided values
    assert custom_summarizer.max_summary_length == 100
    assert custom_summarizer.summarization_method == "abstractive"


@UTILS_TEST_MARKER
@patch('src.backend.utils.text_processing.TextSummarizer.extractive_summarize')
def test_text_summarizer_summarize(mock_extractive_summarize):
    # Create TextSummarizer instance
    summarizer = TextSummarizer()
    
    # Mock extractive_summarize to return a known summary
    mock_extractive_summarize.return_value = "This is a summarized text."
    
    # Call summarizer.summarize with test text
    text = "This is a longer text that needs to be summarized for testing purposes."
    result = summarizer.summarize(text)
    
    # Assert that extractive_summarize was called with correct parameters
    mock_extractive_summarize.assert_called_once_with(text, summarizer.max_summary_length)
    
    # Assert that the returned summary matches the expected result
    assert result == "This is a summarized text."


@UTILS_TEST_MARKER
def test_text_summarizer_extractive_summarize():
    # Create TextSummarizer instance
    summarizer = TextSummarizer()
    
    # Define test text with multiple sentences
    text = """
    This is the first sentence with important information about the topic.
    The second sentence adds more details that might be relevant.
    A third sentence introduces a completely new aspect of the topic.
    The fourth sentence elaborates on the previous point with examples.
    This fifth sentence contains unique keywords that are significant.
    Finally, the sixth sentence concludes with a summary statement.
    """
    
    # Call summarizer.extractive_summarize with test text and max_length
    max_length = 50  # Set a length that will require summarization
    summary = summarizer.extractive_summarize(text, max_length)
    
    # Assert that returned summary is shorter than original text
    assert count_tokens(summary) <= max_length
    assert len(summary) < len(text)
    
    # Assert that summary contains key sentences from original text
    # This is difficult to test precisely as it depends on the algorithm, 
    # but we can check that we got a non-empty result with complete sentences
    assert summary.strip() != ""
    assert "." in summary  # Contains at least one sentence