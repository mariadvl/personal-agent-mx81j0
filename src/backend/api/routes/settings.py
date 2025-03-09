import logging
import uuid
from typing import Dict, Any, Optional, List

from fastapi import APIRouter, Depends, HTTPException, status, Body, Path, Query
from fastapi.security import SecurityScopes

from ...schemas.settings import (
    UserSettings, VoiceSettings, PersonalitySettings, PrivacySettings,
    StorageSettings, LLMSettings, SearchSettings, MemorySettings
)
from ...services.storage_manager import StorageManager
from ...config.settings import Settings
from ..middleware.authentication import get_current_user, AuthenticationError, AuthorizationError
from ..middleware.error_handler import ResourceNotFoundError
from ...utils.event_bus import event_bus

# Configure logger
logger = logging.getLogger(__name__)

# Initialize router, settings, and storage manager
router = APIRouter(prefix="/settings", tags=["settings"])
settings = Settings()
storage_manager = StorageManager()

@router.get("/", response_model=UserSettings, status_code=status.HTTP_200_OK)
async def get_settings(current_user: dict = Depends(get_current_user)):
    """
    Endpoint to retrieve all user settings
    """
    logger.info("Retrieving user settings")
    try:
        user_settings = await storage_manager.sqlite_db.get_user_settings()
        return user_settings
    except Exception as e:
        logger.error(f"Error retrieving settings: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/", response_model=UserSettings, status_code=status.HTTP_200_OK)
async def update_settings(updated_settings: UserSettings, current_user: dict = Depends(get_current_user)):
    """
    Endpoint to update user settings
    """
    logger.info("Updating user settings")
    try:
        updated_settings_dict = updated_settings.dict(exclude_unset=True)
        user_settings = await storage_manager.sqlite_db.update_user_settings(updated_settings_dict)
        event_bus.publish("settings:updated", {"settings": user_settings})
        return user_settings
    except Exception as e:
        logger.error(f"Error updating settings: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/voice", response_model=VoiceSettings, status_code=status.HTTP_200_OK)
async def update_voice_settings(voice_settings: VoiceSettings, current_user: dict = Depends(get_current_user)):
    """
    Endpoint to update voice-specific settings
    """
    logger.info("Updating voice settings")
    try:
        user_settings = await storage_manager.sqlite_db.get_user_settings()
        user_settings["voice_settings"] = voice_settings.dict()
        updated_settings = await storage_manager.sqlite_db.update_user_settings(user_settings)
        event_bus.publish("settings:voice_updated", {"voice_settings": voice_settings})
        return VoiceSettings(**updated_settings["voice_settings"])
    except Exception as e:
        logger.error(f"Error updating voice settings: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/personality", response_model=PersonalitySettings, status_code=status.HTTP_200_OK)
async def update_personality_settings(personality_settings: PersonalitySettings, current_user: dict = Depends(get_current_user)):
    """
    Endpoint to update personality-specific settings
    """
    logger.info("Updating personality settings")
    try:
        user_settings = await storage_manager.sqlite_db.get_user_settings()
        user_settings["personality_settings"] = personality_settings.dict()
        updated_settings = await storage_manager.sqlite_db.update_user_settings(user_settings)
        event_bus.publish("settings:personality_updated", {"personality_settings": personality_settings})
        return PersonalitySettings(**updated_settings["personality_settings"])
    except Exception as e:
        logger.error(f"Error updating personality settings: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/privacy", response_model=PrivacySettings, status_code=status.HTTP_200_OK)
async def update_privacy_settings(privacy_settings: PrivacySettings, current_user: dict = Depends(get_current_user)):
    """
    Endpoint to update privacy-specific settings
    """
    logger.info("Updating privacy settings")
    try:
        user_settings = await storage_manager.sqlite_db.get_user_settings()
        user_settings["privacy_settings"] = privacy_settings.dict()
        updated_settings = await storage_manager.sqlite_db.update_user_settings(user_settings)
        event_bus.publish("settings:privacy_updated", {"privacy_settings": privacy_settings})
        return PrivacySettings(**updated_settings["privacy_settings"])
    except Exception as e:
        logger.error(f"Error updating privacy settings: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/storage", response_model=StorageSettings, status_code=status.HTTP_200_OK)
async def update_storage_settings(storage_settings: StorageSettings, current_user: dict = Depends(get_current_user)):
    """
    Endpoint to update storage-specific settings
    """
    logger.info("Updating storage settings")
    try:
        user_settings = await storage_manager.sqlite_db.get_user_settings()
        user_settings["storage_settings"] = storage_settings.dict()
        updated_settings = await storage_manager.sqlite_db.update_user_settings(user_settings)
        event_bus.publish("settings:storage_updated", {"storage_settings": storage_settings})
        return StorageSettings(**updated_settings["storage_settings"])
    except Exception as e:
        logger.error(f"Error updating storage settings: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/llm", response_model=LLMSettings, status_code=status.HTTP_200_OK)
async def update_llm_settings(llm_settings: LLMSettings, current_user: dict = Depends(get_current_user)):
    """
    Endpoint to update LLM-specific settings
    """
    logger.info("Updating LLM settings")
    try:
        user_settings = await storage_manager.sqlite_db.get_user_settings()
        user_settings["llm_settings"] = llm_settings.dict()
        updated_settings = await storage_manager.sqlite_db.update_user_settings(user_settings)
        event_bus.publish("settings:llm_updated", {"llm_settings": llm_settings})
        return LLMSettings(**updated_settings["llm_settings"])
    except Exception as e:
        logger.error(f"Error updating LLM settings: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/search", response_model=SearchSettings, status_code=status.HTTP_200_OK)
async def update_search_settings(search_settings: SearchSettings, current_user: dict = Depends(get_current_user)):
    """
    Endpoint to update search-specific settings
    """
    logger.info("Updating search settings")
    try:
        user_settings = await storage_manager.sqlite_db.get_user_settings()
        user_settings["search_settings"] = search_settings.dict()
        updated_settings = await storage_manager.sqlite_db.update_user_settings(user_settings)
        event_bus.publish("settings:search_updated", {"search_settings": search_settings})
        return SearchSettings(**updated_settings["search_settings"])
    except Exception as e:
        logger.error(f"Error updating search settings: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.put("/memory", response_model=MemorySettings, status_code=status.HTTP_200_OK)
async def update_memory_settings(memory_settings: MemorySettings, current_user: dict = Depends(get_current_user)):
    """
    Endpoint to update memory-specific settings
    """
    logger.info("Updating memory settings")
    try:
        user_settings = await storage_manager.sqlite_db.get_user_settings()
        user_settings["memory_settings"] = memory_settings.dict()
        updated_settings = await storage_manager.sqlite_db.update_user_settings(user_settings)
        event_bus.publish("settings:memory_updated", {"memory_settings": memory_settings})
        return MemorySettings(**updated_settings["memory_settings"])
    except Exception as e:
        logger.error(f"Error updating memory settings: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/reset", status_code=status.HTTP_200_OK)
async def reset_settings(category: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """
    Endpoint to reset settings to default values
    """
    logger.info(f"Resetting settings. Category: {category}")
    try:
        if category:
            # Reset only the specified category
            if category == "voice":
                settings.set("voice", settings.get("default.voice"))
            elif category == "personality":
                settings.set("personality", settings.get("default.personality"))
            elif category == "privacy":
                settings.set("privacy", settings.get("default.privacy"))
            elif category == "storage":
                settings.set("storage", settings.get("default.storage"))
            elif category == "llm":
                settings.set("llm", settings.get("default.llm"))
            elif category == "search":
                settings.set("search", settings.get("default.search"))
            elif category == "memory":
                settings.set("memory", settings.get("default.memory"))
            else:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid category")
        else:
            # Reset all settings to defaults
            settings.reset_to_defaults()

        event_bus.publish("settings:reset", {"category": category or "all"})
        return {"message": f"Settings reset successfully. Category: {category or 'all'}"}
    except Exception as e:
        logger.error(f"Error resetting settings: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/export", status_code=status.HTTP_200_OK)
async def export_settings(include_sensitive: bool = Query(default=False, description="Include sensitive data like API keys?"), current_user: dict = Depends(get_current_user)):
    """
    Endpoint to export settings to a file
    """
    logger.info(f"Exporting settings. Include sensitive data: {include_sensitive}")
    try:
        # Define export path
        export_dir = settings.get("storage.base_path", "data")
        os.makedirs(export_dir, exist_ok=True)
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        export_path = os.path.join(export_dir, f"settings_export_{timestamp}.json")

        # Export settings
        if settings.export_config(export_path):
            return {"message": "Settings exported successfully", "path": export_path}
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to export settings")
    except Exception as e:
        logger.error(f"Error exporting settings: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/import", response_model=UserSettings, status_code=status.HTTP_200_OK)
async def import_settings(file_path: str = Body(..., embed=True, description="Path to the settings file"), 
                          merge: bool = Query(default=True, description="Merge with existing settings?"), 
                          current_user: dict = Depends(get_current_user)):
    """
    Endpoint to import settings from a file
    """
    logger.info(f"Importing settings from {file_path}. Merge: {merge}")
    try:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File not found")

        # Import settings
        if settings.import_config(file_path):
            user_settings = await storage_manager.sqlite_db.get_user_settings()
            event_bus.publish("settings:imported", {"settings": user_settings})
            return UserSettings(**user_settings)
        else:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to import settings")
    except Exception as e:
        logger.error(f"Error importing settings: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/storage/stats", status_code=status.HTTP_200_OK)
async def get_storage_stats(current_user: dict = Depends(get_current_user)):
    """
    Endpoint to get storage usage statistics
    """
    logger.info("Getting storage statistics")
    try:
        stats = await storage_manager.get_storage_stats()
        return stats
    except Exception as e:
        logger.error(f"Error getting storage stats: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/storage/optimize", status_code=status.HTTP_200_OK)
async def optimize_storage(current_user: dict = Depends(get_current_user)):
    """
    Endpoint to optimize storage for better performance
    """
    logger.info("Optimizing storage")
    try:
        result = await storage_manager.optimize_storage()
        return {"message": "Storage optimization initiated", "success": result}
    except Exception as e:
        logger.error(f"Error optimizing storage: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/backup/create", status_code=status.HTTP_200_OK)
async def create_backup(backup_name: str = Body(default=None, embed=True, description="Optional backup name"),
                        include_files: bool = Body(default=True, embed=True, description="Include user files in backup?"),
                        encrypt: bool = Body(default=True, embed=True, description="Encrypt the backup?"),
                        upload_to_cloud: bool = Body(default=False, embed=True, description="Upload to cloud storage?"),
                        current_user: dict = Depends(get_current_user)):
    """
    Endpoint to create a backup of all data
    """
    logger.info(f"Creating backup. Name: {backup_name}, Include files: {include_files}, Encrypt: {encrypt}, Upload to cloud: {upload_to_cloud}")
    try:
        result = await storage_manager.create_backup(backup_name, include_files, encrypt, upload_to_cloud)
        return result
    except Exception as e:
        logger.error(f"Error creating backup: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/backup/list", status_code=status.HTTP_200_OK)
async def list_backups(include_cloud: bool = Query(default=False, description="Include cloud backups?"), current_user: dict = Depends(get_current_user)):
    """
    Endpoint to list available backups
    """
    logger.info(f"Listing backups. Include cloud: {include_cloud}")
    try:
        backups = await storage_manager.list_backups(include_cloud)
        return backups
    except Exception as e:
        logger.error(f"Error listing backups: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/backup/restore", status_code=status.HTTP_200_OK)
async def restore_backup(backup_name: str = Body(..., embed=True, description="Name of the backup to restore"),
                           decrypt: bool = Body(default=True, embed=True, description="Decrypt the backup?"),
                           download_from_cloud: bool = Body(default=False, embed=True, description="Download from cloud storage?"),
                           current_user: dict = Depends(get_current_user)):
    """
    Endpoint to restore data from a backup
    """
    logger.info(f"Restoring backup: {backup_name}. Decrypt: {decrypt}, Download from cloud: {download_from_cloud}")
    try:
        result = await storage_manager.restore_from_backup(backup_name, decrypt, download_from_cloud)
        return {"message": "Backup restore initiated", "success": result}
    except Exception as e:
        logger.error(f"Error restoring backup: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.delete("/backup/{backup_name}", status_code=status.HTTP_200_OK)
async def delete_backup(backup_name: str = Path(..., description="Name of the backup to delete"),
                           delete_from_cloud: bool = Query(default=False, description="Delete from cloud storage?"),
                           current_user: dict = Depends(get_current_user)):
    """
    Endpoint to delete a backup
    """
    logger.info(f"Deleting backup: {backup_name}. Delete from cloud: {delete_from_cloud}")
    try:
        result = await storage_manager.delete_backup(backup_name, delete_from_cloud)
        return {"message": "Backup deletion initiated", "success": result}
    except Exception as e:
        logger.error(f"Error deleting backup: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# Export the router