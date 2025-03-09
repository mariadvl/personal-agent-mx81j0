import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { getAuthToken } from "../../../../services/api";
import { formatErrorMessage, isApiError } from "../../../../utils/errorHandlers";

// Backend API URL, fall back to localhost if not set
const BACKEND_API_URL = process.env.BACKEND_API_URL || "http://localhost:8000/api";

/**
 * Handles GET requests by proxying them to the backend API
 */
export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // Extract path segments and build target URL
    const path = params.path.join("/");
    const targetUrl = `${BACKEND_API_URL}/${path}`;
    
    // Extract query parameters
    const url = new URL(request.url);
    const queryParams = {};
    url.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });
    
    // Get auth token and set up headers
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };
    
    // Copy selected headers from the original request
    const headersToForward = ["content-type", "user-agent", "x-request-id"];
    for (const header of headersToForward) {
      const value = request.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    }
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    // Forward the request to the backend API
    const response = await axios.get(targetUrl, {
      params: queryParams,
      headers,
    });
    
    // Return the response
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Handles POST requests by proxying them to the backend API
 */
export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // Extract path segments and build target URL
    const path = params.path.join("/");
    const targetUrl = `${BACKEND_API_URL}/${path}`;
    
    // Parse the request body based on content type
    const body = await parseRequestBody(request);
    
    // Get auth token and set up headers
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    
    // Copy selected headers from the original request
    const headersToForward = ["content-type", "user-agent", "x-request-id", "accept"];
    for (const header of headersToForward) {
      const value = request.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    }
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    // Forward the request to the backend API
    const response = await axios.post(targetUrl, body, { headers });
    
    // Return the response
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Handles PUT requests by proxying them to the backend API
 */
export async function PUT(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // Extract path segments and build target URL
    const path = params.path.join("/");
    const targetUrl = `${BACKEND_API_URL}/${path}`;
    
    // Parse the request body
    const body = await request.json();
    
    // Get auth token and set up headers
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
    
    // Copy selected headers from the original request
    const headersToForward = ["user-agent", "x-request-id"];
    for (const header of headersToForward) {
      const value = request.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    }
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    // Forward the request to the backend API
    const response = await axios.put(targetUrl, body, { headers });
    
    // Return the response
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Handles DELETE requests by proxying them to the backend API
 */
export async function DELETE(request: NextRequest, { params }: { params: { path: string[] } }) {
  try {
    // Extract path segments and build target URL
    const path = params.path.join("/");
    const targetUrl = `${BACKEND_API_URL}/${path}`;
    
    // Get auth token and set up headers
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "Accept": "application/json",
    };
    
    // Copy selected headers from the original request
    const headersToForward = ["content-type", "user-agent", "x-request-id"];
    for (const header of headersToForward) {
      const value = request.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    }
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    // Forward the request to the backend API
    const response = await axios.delete(targetUrl, { headers });
    
    // Return the response
    return NextResponse.json(response.data);
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Handles API errors and formats them into appropriate responses
 */
function handleApiError(error: Error): NextResponse {
  let statusCode = 500;
  let errorMessage = formatErrorMessage(error);
  let errorDetail = null;
  let errorPath = null;
  
  if (axios.isAxiosError(error)) {
    if (error.response) {
      // Response received with error status
      statusCode = error.response.status;
      
      // Try to extract error information from response data
      if (error.response.data) {
        if (typeof error.response.data === "object") {
          errorMessage = error.response.data.error || 
                      error.response.data.message || 
                      error.response.data.detail || 
                      error.message;
          errorDetail = error.response.data.detail || error.message;
        } else if (typeof error.response.data === "string") {
          errorMessage = error.response.data;
        }
      }
      
      errorPath = error.response.config.url;
    } else if (error.request) {
      // Request was made but no response received
      statusCode = 503; // Service Unavailable
      errorMessage = "Backend service is unavailable";
      errorDetail = "No response received from the backend API";
    } else {
      // Error in request configuration
      statusCode = 400;
      errorMessage = error.message;
    }
  } else if (isApiError(error)) {
    statusCode = error.status_code;
    errorMessage = error.error;
    errorDetail = error.detail;
    errorPath = error.path;
  }
  
  const errorResponse = {
    success: false,
    error: errorMessage,
    status_code: statusCode,
    detail: errorDetail,
    path: errorPath,
    timestamp: new Date().toISOString()
  };
  
  return NextResponse.json(errorResponse, { status: statusCode });
}

/**
 * Parses the request body based on content type
 */
async function parseRequestBody(request: NextRequest): Promise<any> {
  const contentType = request.headers.get("Content-Type") || "";
  
  if (contentType.includes("application/json")) {
    return await request.json();
  } else if (contentType.includes("multipart/form-data")) {
    return await request.formData();
  } else {
    return await request.text();
  }
}