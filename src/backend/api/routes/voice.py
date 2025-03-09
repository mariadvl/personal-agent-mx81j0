from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form, Query, Path, Body, Response
from fastapi import StreamingResponse
import logging
import base64
import io
from io import BytesIO
from typing import Optional, Dict, List, Any

from ...services.voice_processor import VoiceProcessor, TranscriptionError, SynthesisError
from ...schemas.voice import (
    TranscriptionRequest, TranscriptionResponse,
    SynthesisRequest, SynthesisResponse,
    VoiceListRequest, VoiceListResponse, VoiceInfo
)
from ...config.settings import Settings
from ..middleware.authentication import get_current_user
from ...utils.event_bus import EventBus

# Configure logger
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/voice", tags=["voice"])

# Initialize settings
settings = Settings()

# Initialize event bus
event_bus = EventBus()

# Maximum upload size in MB
MAX_UPLOAD_SIZE_MB = settings.get('voice.max_upload_size_mb', 10)

async def get_voice_processor():
    """
    Dependency function to get the voice processor instance.
    
    Returns:
        VoiceProcessor: Initialized voice processor instance
    """
    return VoiceProcessor(settings, event_bus)

@router.post("/transcribe", response_model=TranscriptionResponse, status_code=status.HTTP_200_OK)
async def transcribe_audio(
    request: TranscriptionRequest,
    voice_processor: VoiceProcessor = Depends(get_voice_processor),
    current_user: dict = Depends(get_current_user)
):
    """
    Converts speech to text from audio data.
    
    Args:
        request: TranscriptionRequest containing audio data or file path
        voice_processor: VoiceProcessor instance
        current_user: Current authenticated user
        
    Returns:
        TranscriptionResponse with transcribed text and metadata
    """
    logger.info(f"Transcription request received, audio format: {'base64' if request.audio_data else 'file path'}")
    
    try:
        # Process transcription request
        result = voice_processor.transcribe_audio(request)
        
        logger.info(f"Transcription successful, text length: {len(result.text)}")
        
        return result
        
    except TranscriptionError as e:
        logger.error(f"Transcription error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transcription failed: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during transcription: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@router.post("/transcribe/file", response_model=TranscriptionResponse, status_code=status.HTTP_200_OK)
async def transcribe_audio_file(
    file: UploadFile,
    language: Optional[str] = Form(None),
    model: Optional[str] = Form(None),
    temperature: Optional[float] = Form(None),
    word_timestamps: Optional[bool] = Form(False),
    voice_processor: VoiceProcessor = Depends(get_voice_processor),
    current_user: dict = Depends(get_current_user)
):
    """
    Converts speech to text from an uploaded audio file.
    
    Args:
        file: Uploaded audio file
        language: Optional language code
        model: Optional model to use for transcription
        temperature: Optional temperature parameter
        word_timestamps: Whether to include word-level timestamps
        voice_processor: VoiceProcessor instance
        current_user: Current authenticated user
        
    Returns:
        TranscriptionResponse with transcribed text and metadata
    """
    logger.info(f"File transcription request received, filename: {file.filename}, content-type: {file.content_type}")
    
    try:
        # Check file size
        file_size_mb = 0
        file_content = await file.read()
        file_size_mb = len(file_content) / (1024 * 1024)
        
        if file_size_mb > MAX_UPLOAD_SIZE_MB:
            logger.warning(f"File too large: {file_size_mb:.2f}MB (max: {MAX_UPLOAD_SIZE_MB}MB)")
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE_MB}MB"
            )
        
        # Convert file content to base64
        base64_data = base64.b64encode(file_content).decode('utf-8')
        
        # Create request object
        request = TranscriptionRequest(
            audio_data=base64_data,
            language=language,
            model=model,
            temperature=temperature,
            word_timestamps=word_timestamps
        )
        
        # Process transcription request
        result = voice_processor.transcribe_audio(request)
        
        logger.info(f"File transcription successful, text length: {len(result.text)}")
        
        return result
        
    except TranscriptionError as e:
        logger.error(f"File transcription error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transcription failed: {str(e)}"
        )
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Unexpected error during file transcription: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@router.post("/synthesize", response_model=SynthesisResponse, status_code=status.HTTP_200_OK)
async def synthesize_speech(
    request: SynthesisRequest,
    voice_processor: VoiceProcessor = Depends(get_voice_processor),
    current_user: dict = Depends(get_current_user)
):
    """
    Converts text to speech.
    
    Args:
        request: SynthesisRequest containing text and voice parameters
        voice_processor: VoiceProcessor instance
        current_user: Current authenticated user
        
    Returns:
        SynthesisResponse with audio data and metadata
    """
    logger.info(f"Speech synthesis request received, text length: {len(request.text)}, provider: {request.provider or 'default'}")
    
    try:
        # Process synthesis request
        result = voice_processor.synthesize_speech(request)
        
        logger.info(f"Speech synthesis successful, audio size: {len(result.audio_data)} bytes")
        
        return result
        
    except SynthesisError as e:
        logger.error(f"Speech synthesis error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Speech synthesis failed: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during speech synthesis: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@router.post("/synthesize/stream", status_code=status.HTTP_200_OK)
async def synthesize_speech_stream(
    request: SynthesisRequest,
    voice_processor: VoiceProcessor = Depends(get_voice_processor),
    current_user: dict = Depends(get_current_user)
):
    """
    Streams audio data from text.
    
    Args:
        request: SynthesisRequest containing text and voice parameters
        voice_processor: VoiceProcessor instance
        current_user: Current authenticated user
        
    Returns:
        Streaming response with audio data
    """
    logger.info(f"Streaming speech synthesis request received, text length: {len(request.text)}, provider: {request.provider or 'default'}")
    
    try:
        # Ensure streaming is enabled
        request.stream = True
        
        # Determine content type based on output format
        output_format = request.output_format or "mp3"
        content_type = f"audio/{output_format}"
        
        # Get the audio stream generator
        audio_generator = voice_processor.synthesize_speech_stream(request)
        
        logger.info(f"Streaming speech synthesis started, content-type: {content_type}")
        
        # Return streaming response
        return StreamingResponse(
            audio_generator,
            media_type=content_type
        )
        
    except SynthesisError as e:
        logger.error(f"Streaming speech synthesis error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Speech synthesis failed: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Unexpected error during streaming speech synthesis: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@router.post("/voices", response_model=VoiceListResponse, status_code=status.HTTP_200_OK)
async def get_voices(
    request: VoiceListRequest,
    voice_processor: VoiceProcessor = Depends(get_voice_processor),
    current_user: dict = Depends(get_current_user)
):
    """
    Gets list of available voices.
    
    Args:
        request: VoiceListRequest with optional provider filter
        voice_processor: VoiceProcessor instance
        current_user: Current authenticated user
        
    Returns:
        VoiceListResponse with available voices
    """
    logger.info(f"Voice list request received, provider: {request.provider or 'all'}, force_refresh: {request.force_refresh}")
    
    try:
        # Get voices from processor
        result = voice_processor.get_available_voices(
            provider=request.provider,
            force_refresh=request.force_refresh
        )
        
        logger.info(f"Voice list retrieved, count: {len(result.voices)}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error retrieving voice list: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve voice list: {str(e)}"
        )

@router.get("/voices", response_model=VoiceListResponse, status_code=status.HTTP_200_OK)
async def get_voices_query(
    provider: Optional[str] = Query(None, description="Provider filter"),
    force_refresh: Optional[bool] = Query(False, description="Force refresh voice list"),
    voice_processor: VoiceProcessor = Depends(get_voice_processor),
    current_user: dict = Depends(get_current_user)
):
    """
    Gets list of available voices using query parameters.
    
    Args:
        provider: Optional provider filter
        force_refresh: Whether to force refresh the voice list
        voice_processor: VoiceProcessor instance
        current_user: Current authenticated user
        
    Returns:
        VoiceListResponse with available voices
    """
    logger.info(f"Voice list request received (GET), provider: {provider or 'all'}, force_refresh: {force_refresh}")
    
    try:
        # Create request object
        request = VoiceListRequest(
            provider=provider,
            force_refresh=force_refresh
        )
        
        # Get voices from processor
        result = voice_processor.get_available_voices(
            provider=request.provider,
            force_refresh=request.force_refresh
        )
        
        logger.info(f"Voice list retrieved, count: {len(result.voices)}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error retrieving voice list: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve voice list: {str(e)}"
        )

@router.get("/voices/{voice_id}/check", status_code=status.HTTP_200_OK)
async def check_voice_availability(
    voice_id: str = Path(..., description="Voice ID to check"),
    provider: Optional[str] = Query(None, description="Provider to check"),
    voice_processor: VoiceProcessor = Depends(get_voice_processor),
    current_user: dict = Depends(get_current_user)
):
    """
    Checks if a specific voice is available.
    
    Args:
        voice_id: Voice ID to check
        provider: Optional provider to check
        voice_processor: VoiceProcessor instance
        current_user: Current authenticated user
        
    Returns:
        JSON response with availability status
    """
    logger.info(f"Voice availability check received, voice_id: {voice_id}, provider: {provider or 'any'}")
    
    try:
        # Check voice availability
        is_available = voice_processor.is_voice_available(voice_id, provider)
        
        logger.info(f"Voice {voice_id} availability: {is_available}")
        
        return {
            "voice_id": voice_id,
            "provider": provider,
            "is_available": is_available
        }
        
    except Exception as e:
        logger.error(f"Error checking voice availability: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check voice availability: {str(e)}"
        )