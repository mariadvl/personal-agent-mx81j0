import os
import uuid
import shutil
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form, Path, Query, BackgroundTasks
from fastapi.responses import JSONResponse

from ...schemas.document import ALLOWED_FILE_TYPES, DocumentCreate, DocumentResponse, DocumentProcessRequest, DocumentProcessResponse, DocumentUploadResponse
from ...services.document_processor import DocumentProcessor
from ...services.storage_manager import StorageManager
from ...services.memory_service import MemoryService
from ...config.settings import Settings
from ..middleware.error_handler import ResourceNotFoundError, ValidationError
from ...utils.document_parsers import get_file_extension
from ...utils.logging_setup import logger

# FastAPI router for document-related endpoints
router = APIRouter(prefix="/api/document", tags=["document"])

# Global settings instance
settings = Settings()

# Global upload directory from settings
UPLOAD_DIR = settings.get("document.upload_dir", "data/documents")

# Global maximum file size from settings
MAX_FILE_SIZE = settings.get("document.max_file_size", 10 * 1024 * 1024)  # 10 MB


async def get_document_processor(storage_manager: StorageManager = Depends(StorageManager),
                                MemoryService: MemoryService = Depends(MemoryService)) -> DocumentProcessor:
    """Dependency function to get an instance of the DocumentProcessor service"""
    sqlite_db = storage_manager.get_sqlite_db()
    return DocumentProcessor(MemoryService, sqlite_db)


async def get_storage_manager() -> StorageManager:
    """Dependency function to get an instance of the StorageManager service"""
    storage_manager = StorageManager()
    await storage_manager.initialize()
    return storage_manager


async def get_memory_service(StorageManager: StorageManager = Depends(StorageManager)) -> MemoryService:
    """Dependency function to get an instance of the MemoryService"""
    vector_db = StorageManager.get_vector_db()
    sqlite_db = StorageManager.get_sqlite_db()
    return MemoryService(vector_db, sqlite_db)


def ensure_upload_dir() -> str:
    """Ensures that the document upload directory exists"""
    if not os.path.exists(UPLOAD_DIR):
        os.makedirs(UPLOAD_DIR)
    return UPLOAD_DIR


async def save_uploaded_file(file: UploadFile) -> Dict[str, Any]:
    """Saves an uploaded file to the upload directory"""
    upload_dir = ensure_upload_dir()
    file_extension = get_file_extension(file.filename)
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = os.path.join(upload_dir, unique_filename)

    try:
        with open(file_path, "wb") as f:
            shutil.copyfileobj(file.file, f)
        return {"path": file_path, "size": os.path.getsize(file_path), "type": file_extension}
    except Exception as e:
        logger.error(f"Error saving uploaded file: {str(e)}")
        return {"error": str(e)}


def validate_file(file: UploadFile) -> bool:
    """Validates an uploaded file before processing"""
    if file is None:
        raise ValidationError("No file was uploaded")

    if not file.filename:
        raise ValidationError("Uploaded file must have a filename")

    file_extension = get_file_extension(file.filename)
    if file_extension not in ALLOWED_FILE_TYPES:
        raise ValidationError(f"Unsupported file type. Allowed types: {', '.join(ALLOWED_FILE_TYPES)}")

    if file.size > MAX_FILE_SIZE:
        raise ValidationError(f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / (1024 * 1024)} MB")

    return True


async def process_document_background(file_path: str, document_id: uuid.UUID, store_in_memory: bool,
                                    generate_summary: bool, processing_options: Dict[str, Any],
                                    document_processor: DocumentProcessor):
    """Background task for processing a document"""
    logger.info(f"Starting background processing for document {document_id}")
    try:
        await document_processor.process_document(file_path, document_id, store_in_memory, generate_summary, processing_options)
        logger.info(f"Background processing completed for document {document_id}")
    except Exception as e:
        logger.error(f"Error in background processing for document {document_id}: {str(e)}")


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...),
                          storage_manager: StorageManager = Depends(get_storage_manager),
                          document_processor: DocumentProcessor = Depends(get_document_processor)):
    """Uploads a document file and creates a document record"""
    try:
        validate_file(file)
        file_info = await save_uploaded_file(file)

        if "error" in file_info:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=file_info["error"])

        document_create = DocumentCreate(filename=file.filename, file_type=file_info["type"], storage_path=file_info["path"])
        document = await storage_manager.get_sqlite_db().create_document(
            filename=document_create.filename,
            file_type=document_create.file_type,
            storage_path=document_create.storage_path,
            metadata=document_create.metadata
        )

        return DocumentUploadResponse(document_id=document["id"], filename=document["filename"], success=True)
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during document upload"
        )


@router.post("/{document_id}/process", response_model=DocumentProcessResponse)
async def process_document(document_id: uuid.UUID = Path(..., description="ID of the document to process"),
                            request: DocumentProcessRequest = Depends(),
                            background_tasks: BackgroundTasks = Depends(),
                            storage_manager: StorageManager = Depends(get_storage_manager),
                            document_processor: DocumentProcessor = Depends(get_document_processor)):
    """Processes a previously uploaded document"""
    try:
        document = await storage_manager.get_sqlite_db().get_document(document_id)
        if not document:
            raise ResourceNotFoundError(f"Document with id {document_id} not found")

        background_tasks.add_task(
            process_document_background,
            file_path=document["storage_path"],
            document_id=document_id,
            store_in_memory=request.store_in_memory,
            generate_summary=request.generate_summary,
            processing_options=request.processing_options,
            document_processor=document_processor
        )

        await storage_manager.get_sqlite_db().update_document(document_id, {"processed": True})

        return DocumentProcessResponse(document_id=document_id, success=True)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during document processing"
        )


@router.get("/{document_id}/status")
async def get_document_status(document_id: uuid.UUID = Path(..., description="ID of the document to get status for"),
                              storage_manager: StorageManager = Depends(get_storage_manager),
                              document_processor: DocumentProcessor = Depends(get_document_processor)):
    """Gets the processing status of a document"""
    try:
        document = await storage_manager.get_sqlite_db().get_document(document_id)
        if not document:
            raise ResourceNotFoundError(f"Document with id {document_id} not found")

        status_info = await document_processor.get_processing_status(document_id)
        return status_info
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting document status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while retrieving document status"
        )


@router.post("/{document_id}/cancel")
async def cancel_processing(document_id: uuid.UUID = Path(..., description="ID of the document to cancel processing for"),
                             storage_manager: StorageManager = Depends(get_storage_manager),
                             document_processor: DocumentProcessor = Depends(get_document_processor)):
    """Cancels an ongoing document processing task"""
    try:
        document = await storage_manager.get_sqlite_db().get_document(document_id)
        if not document:
            raise ResourceNotFoundError(f"Document with id {document_id} not found")

        cancel_status = await document_processor.cancel_processing(document_id)
        await storage_manager.get_sqlite_db().update_document(document_id, {"processed": False})
        return {"success": cancel_status}
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error cancelling document processing: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while cancelling document processing"
        )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: uuid.UUID = Path(..., description="ID of the document to retrieve"),
                       storage_manager: StorageManager = Depends(get_storage_manager)):
    """Gets information about a document"""
    try:
        document = await storage_manager.get_sqlite_db().get_document(document_id)
        if not document:
            raise ResourceNotFoundError(f"Document with id {document_id} not found")

        return DocumentResponse(**document)
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while retrieving document information"
        )


@router.delete("/{document_id}")
async def delete_document(document_id: uuid.UUID = Path(..., description="ID of the document to delete"),
                          storage_manager: StorageManager = Depends(get_storage_manager),
                          memory_service: MemoryService = Depends(get_memory_service)):
    """Deletes a document and its associated files"""
    try:
        document = await storage_manager.get_sqlite_db().get_document(document_id)
        if not document:
            raise ResourceNotFoundError(f"Document with id {document_id} not found")

        # Delete associated memory items
        await memory_service.get_by_source(source_type="document", source_id=document_id)

        # Delete the document file
        if os.path.exists(document["storage_path"]):
            os.remove(document["storage_path"])

        # Delete the document record
        await storage_manager.get_sqlite_db().delete_document(document_id)

        return {"success": True}
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred during document deletion"
        )


@router.get("/list")
async def list_documents(file_type: Optional[str] = Query(None, description="Filter by file type"),
                           processed: Optional[bool] = Query(None, description="Filter by processing status"),
                           limit: int = Query(100, description="Maximum number of documents to return"),
                           offset: int = Query(0, description="Number of documents to skip"),
                           storage_manager: StorageManager = Depends(get_storage_manager)):
    """Lists all documents with optional filtering"""
    try:
        filters = {}
        if file_type:
            filters["file_type"] = file_type
        if processed is not None:
            filters["processed"] = processed

        documents = await storage_manager.get_sqlite_db().get_documents(filters=filters, limit=limit, offset=offset)
        total_count = await storage_manager.get_sqlite_db().count_records(model_class="Document", filters=filters)

        return {"documents": documents, "total_count": total_count, "limit": limit, "offset": offset}
    except Exception as e:
        logger.error(f"Error listing documents: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while listing documents"
        )


@router.get("/{document_id}/content")
async def get_document_content(document_id: uuid.UUID = Path(..., description="ID of the document to get content for"),
                                storage_manager: StorageManager = Depends(get_storage_manager),
                                memory_service: MemoryService = Depends(get_memory_service)):
    """Gets the processed content of a document"""
    try:
        document = await storage_manager.get_sqlite_db().get_document(document_id)
        if not document:
            raise ResourceNotFoundError(f"Document with id {document_id} not found")

        if not document["processed"]:
            raise ValidationError("Document has not been processed yet")

        memory_items = await memory_service.get_by_source(source_type="document", source_id=document_id)
        content = [item["content"] for item in memory_items]

        return {"document_id": document_id, "content": content}
    except ResourceNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting document content: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while retrieving document content"
        )