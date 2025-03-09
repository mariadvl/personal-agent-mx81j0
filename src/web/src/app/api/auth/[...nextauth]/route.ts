import { NextRequest, NextResponse } from 'next/server';
import { 
  authenticate, 
  getAuthState, 
  logout, 
  refreshSession 
} from '../../../../../services/authService';
import { 
  AuthMethod, 
  AuthLevel, 
  AuthRequest, 
  AuthResponse 
} from '../../../../../types/auth';
import { 
  setAuthToken, 
  clearAuthToken 
} from '../../../../../services/api';

/**
 * Handles GET requests to the auth endpoint
 * Used for session validation, refresh, and getting available authentication methods
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Get the path segments to identify the action
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const action = pathSegments[pathSegments.length - 1];

  try {
    switch (action) {
      // Get current session state
      case 'session': {
        const authState = getAuthState();
        return NextResponse.json({ success: true, data: authState });
      }

      // Refresh the session
      case 'refresh': {
        const success = await refreshSession();
        if (success) {
          const authState = getAuthState();
          return NextResponse.json({ success: true, data: authState });
        } else {
          return NextResponse.json(
            { success: false, error: 'Session refresh failed' },
            { status: 401 }
          );
        }
      }

      // Get available authentication methods
      case 'providers': {
        const providers = getAuthProviders();
        return NextResponse.json({ success: true, data: providers });
      }

      // Handle unknown actions
      default:
        return NextResponse.json(
          { success: false, error: 'Not found' },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error('Auth GET error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Authentication error' },
      { status: 500 }
    );
  }
}

/**
 * Handles POST requests to the auth endpoint
 * Used for login and logout
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  // Get the path segments to identify the action
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const action = pathSegments[pathSegments.length - 1];

  try {
    // Parse the request body
    const body = await request.json();

    switch (action) {
      // Handle login/authentication
      case 'callback': {
        try {
          const response = await handleAuthRequest(body);
          
          if (response.success && response.sessionToken) {
            // Set the auth token for API requests
            setAuthToken(response.sessionToken);
            
            return NextResponse.json({
              success: true,
              data: response.authState
            });
          } else {
            return NextResponse.json(
              { success: false, error: response.error || 'Authentication failed' },
              { status: 401 }
            );
          }
        } catch (error) {
          console.error('Auth callback error:', error);
          return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Authentication error' },
            { status: 500 }
          );
        }
      }

      // Handle logout
      case 'signout': {
        await logout();
        clearAuthToken();
        
        return NextResponse.json({ success: true });
      }

      // Handle unknown actions
      default:
        return NextResponse.json(
          { success: false, error: 'Not found' },
          { status: 404 }
        );
    }
  } catch (error) {
    console.error('Auth POST error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Authentication error' },
      { status: 500 }
    );
  }
}

/**
 * Processes an authentication request with the appropriate credentials
 */
async function handleAuthRequest(requestBody: any): Promise<AuthResponse> {
  const { 
    method, 
    credential, 
    biometricData, 
    deviceToken,
    requestedLevel = AuthLevel.STANDARD
  } = requestBody;

  const authRequest: AuthRequest = {
    method: method as AuthMethod,
    credential,
    biometricData,
    deviceToken,
    requestedLevel: requestedLevel as AuthLevel
  };

  return authenticate(authRequest);
}

/**
 * Returns the available authentication methods based on settings
 */
function getAuthProviders() {
  // In a real implementation, this would get the current auth settings
  // from authService to determine which methods are enabled
  
  const providers = {
    methods: [] as string[]
  };
  
  // Include PIN if enabled
  const isPinEnabled = true; // Should check actual settings
  if (isPinEnabled) {
    providers.methods.push(AuthMethod.PIN);
  }
  
  // Include PASSWORD if enabled
  const isPasswordEnabled = true; // Should check actual settings
  if (isPasswordEnabled) {
    providers.methods.push(AuthMethod.PASSWORD);
  }
  
  // Include BIOMETRIC if enabled
  const isBiometricEnabled = true; // Should check actual settings
  if (isBiometricEnabled) {
    providers.methods.push(AuthMethod.BIOMETRIC);
  }
  
  // Include DEVICE if enabled
  const isDeviceEnabled = true; // Should check actual settings
  if (isDeviceEnabled) {
    providers.methods.push(AuthMethod.DEVICE);
  }
  
  return providers;
}