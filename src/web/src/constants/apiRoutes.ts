/**
 * API Routes
 * 
 * This file defines all API routes used by the frontend to communicate with the backend services.
 * It serves as a central location for managing API endpoint URLs, ensuring consistency across
 * the application and making it easier to update endpoints when needed.
 */

// Base API URL, falls back to localhost if environment variable is not set
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';

/**
 * API Routes organized by category
 */
export const API_ROUTES = {
  CONVERSATION: {
    BASE: `${API_BASE_URL}/conversation`,
    GET_BY_ID: `${API_BASE_URL}/conversation/{id}`,
    GET_MESSAGES: `${API_BASE_URL}/conversation/{id}/messages`,
    UPDATE: `${API_BASE_URL}/conversation/{id}`,
    DELETE: `${API_BASE_URL}/conversation/{id}`,
    SUMMARIZE: `${API_BASE_URL}/conversation/{id}/summarize`,
  },
  
  MEMORY: {
    BASE: `${API_BASE_URL}/memory`,
    GET_BY_ID: `${API_BASE_URL}/memory/{id}`,
    UPDATE: `${API_BASE_URL}/memory/{id}`,
    DELETE: `${API_BASE_URL}/memory/{id}`,
    SEARCH: `${API_BASE_URL}/memory/search`,
    CONTEXT: `${API_BASE_URL}/memory/context`,
    BY_CATEGORY: `${API_BASE_URL}/memory/category/{category}`,
    MARK_IMPORTANT: `${API_BASE_URL}/memory/{id}/important`,
    STATS: `${API_BASE_URL}/memory/stats`,
    BATCH: `${API_BASE_URL}/memory/batch`,
  },
  
  DOCUMENT: {
    BASE: `${API_BASE_URL}/document`,
    UPLOAD: `${API_BASE_URL}/document/upload`,
    PROCESS: `${API_BASE_URL}/document/{id}/process`,
    GET_BY_ID: `${API_BASE_URL}/document/{id}`,
    STATUS: `${API_BASE_URL}/document/{id}/status`,
    DELETE: `${API_BASE_URL}/document/{id}`,
    DOWNLOAD: `${API_BASE_URL}/document/{id}/download`,
    STATS: `${API_BASE_URL}/document/stats`,
  },
  
  WEB: {
    BASE: `${API_BASE_URL}/web`,
    EXTRACT: `${API_BASE_URL}/web/extract`,
    GET_BY_ID: `${API_BASE_URL}/web/{id}`,
    DELETE: `${API_BASE_URL}/web/{id}`,
    SEARCH: `${API_BASE_URL}/web/search`,
  },
  
  SEARCH: {
    BASE: `${API_BASE_URL}/search`,
    EXECUTE: `${API_BASE_URL}/search/execute`,
    HISTORY: `${API_BASE_URL}/search/history`,
    CLEAR_HISTORY: `${API_BASE_URL}/search/history/clear`,
  },
  
  VOICE: {
    BASE: `${API_BASE_URL}/voice`,
    TRANSCRIBE: `${API_BASE_URL}/voice/transcribe`,
    SYNTHESIZE: `${API_BASE_URL}/voice/synthesize`,
    VOICES: `${API_BASE_URL}/voice/voices`,
  },
  
  SETTINGS: {
    BASE: `${API_BASE_URL}/settings`,
    VOICE: `${API_BASE_URL}/settings/voice`,
    PERSONALITY: `${API_BASE_URL}/settings/personality`,
    PRIVACY: `${API_BASE_URL}/settings/privacy`,
    STORAGE: `${API_BASE_URL}/settings/storage`,
    BACKUP: `${API_BASE_URL}/settings/backup`,
    RESTORE: `${API_BASE_URL}/settings/restore`,
    EXPORT: `${API_BASE_URL}/settings/export`,
    IMPORT: `${API_BASE_URL}/settings/import`,
    RESET: `${API_BASE_URL}/settings/reset`,
  },
};