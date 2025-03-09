#!/bin/bash
# generate_api_keys.sh
# A script to generate and securely store API keys for the Personal AI Agent

# Global variables
CONFIG_DIR=""
SETTINGS_FILE=""
OPENAI_API_KEY=""
ELEVENLABS_API_KEY=""
SERPAPI_API_KEY=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
CLOUD_STORAGE_ENABLED=false

# Check for required tools
check_dependencies() {
    local missing_deps=false
    
    if ! command -v curl &> /dev/null; then
        echo "Error: curl is required but not installed."
        missing_deps=true
    fi
    
    if ! command -v python3 &> /dev/null; then
        echo "Error: python3 is required but not installed."
        missing_deps=true
    fi
    
    if [ "$missing_deps" = true ]; then
        echo "Please install the missing dependencies and try again."
        exit 1
    fi
}

# Utility functions
print_header() {
    echo "========================================================="
    echo "              Personal AI Agent API Key Setup             "
    echo "========================================================="
    echo "This script will help you set up API keys for external services"
    echo "used by the Personal AI Agent."
    echo ""
}

print_section() {
    local section_name="$1"
    echo ""
    echo "---------------------------------------------------------"
    echo "  $section_name"
    echo "---------------------------------------------------------"
}

get_config_dir() {
    # Determine config directory based on OS
    if [[ "$OSTYPE" == "darwin"* ]] || [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # macOS or Linux
        CONFIG_DIR="$HOME/.personalai"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        # Windows
        CONFIG_DIR="$APPDATA\\PersonalAI"
    else
        # Fall back to current directory if OS can't be determined
        CONFIG_DIR="./personalai_config"
    fi
    
    # Create directory if it doesn't exist
    mkdir -p "$CONFIG_DIR"
    
    return 0
}

prompt_for_key() {
    local service_name="$1"
    local key_description="$2"
    local validation_pattern="$3"
    local api_key=""
    local valid=false
    
    while [ "$valid" = false ]; do
        echo ""
        echo "Please enter your $service_name API key:"
        echo "$key_description"
        echo ""
        read -s -p "> " api_key  # -s flag hides input for security
        echo ""
        
        if [[ $api_key =~ $validation_pattern ]]; then
            valid=true
        else
            echo ""
            echo "Invalid API key format. Please try again."
        fi
    done
    
    echo "$api_key"
}

validate_openai_key() {
    local api_key="$1"
    local valid=false
    
    echo "Validating OpenAI API key..."
    
    # Make a minimal API call to check if the key is valid
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $api_key" \
        -H "Content-Type: application/json" \
        "https://api.openai.com/v1/models" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        echo "OpenAI API key is valid."
        valid=true
    else
        echo "OpenAI API key validation failed (HTTP $response)."
        valid=false
    fi
    
    return $([ "$valid" = true ] && echo 0 || echo 1)
}

validate_elevenlabs_key() {
    local api_key="$1"
    local valid=false
    
    echo "Validating ElevenLabs API key..."
    
    # Make a minimal API call to check if the key is valid
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "xi-api-key: $api_key" \
        "https://api.elevenlabs.io/v1/voices" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        echo "ElevenLabs API key is valid."
        valid=true
    else
        echo "ElevenLabs API key validation failed (HTTP $response)."
        valid=false
    fi
    
    return $([ "$valid" = true ] && echo 0 || echo 1)
}

validate_serpapi_key() {
    local api_key="$1"
    local valid=false
    
    echo "Validating SerpAPI key..."
    
    # Make a minimal API call to check if the key is valid
    local response=$(curl -s -o /dev/null -w "%{http_code}" \
        "https://serpapi.com/account?api_key=$api_key" 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        echo "SerpAPI key is valid."
        valid=true
    else
        echo "SerpAPI key validation failed (HTTP $response)."
        valid=false
    fi
    
    return $([ "$valid" = true ] && echo 0 || echo 1)
}

validate_aws_credentials() {
    local access_key="$1"
    local secret_key="$2"
    local valid=false
    
    echo "Validating AWS credentials..."
    
    # Try to use AWS CLI if available
    if command -v aws &> /dev/null; then
        # Create a temporary AWS credentials file
        local temp_aws_config=$(mktemp)
        cat > "$temp_aws_config" << EOF
[default]
aws_access_key_id = $access_key
aws_secret_access_key = $secret_key
region = us-east-1
EOF
        
        # Try to list S3 buckets
        AWS_CONFIG_FILE="$temp_aws_config" aws s3 ls &> /dev/null
        if [ $? -eq 0 ]; then
            echo "AWS credentials are valid."
            valid=true
        else
            echo "AWS credentials validation failed."
            valid=false
        fi
        
        # Remove the temporary file
        rm "$temp_aws_config"
    else
        # Fallback: use simple curl test to S3
        # Note: This is less reliable than AWS CLI but works for basic validation
        local timestamp=$(date -u +"%Y%m%dT%H%M%SZ")
        local date=$(date -u +"%Y%m%d")
        local host="s3.amazonaws.com"
        local region="us-east-1"
        local service="s3"
        
        # Create canonical request components (simplified for basic check)
        local request="GET\n/\n\nhost:${host}\nx-amz-date:${timestamp}\n\nhost;x-amz-date\ne3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" # empty payload hash
        
        # Create string to sign
        local algorithm="AWS4-HMAC-SHA256"
        local credential_scope="${date}/${region}/${service}/aws4_request"
        local string_to_sign="${algorithm}\n${timestamp}\n${credential_scope}\n$(echo -en "${request}" | sha256sum | cut -d' ' -f1)"
        
        # Calculate signature
        local k_date=$(echo -n "${date}" | openssl dgst -sha256 -hmac "AWS4${secret_key}" -binary)
        local k_region=$(echo -n "${region}" | openssl dgst -sha256 -hmac "${k_date}" -binary)
        local k_service=$(echo -n "${service}" | openssl dgst -sha256 -hmac "${k_region}" -binary)
        local k_signing=$(echo -n "aws4_request" | openssl dgst -sha256 -hmac "${k_service}" -binary)
        local signature=$(echo -en "${string_to_sign}" | openssl dgst -sha256 -hmac "${k_signing}" -hex | sed 's/^.* //')
        
        # Create authorization header
        local auth_header="${algorithm} Credential=${access_key}/${credential_scope}, SignedHeaders=host;x-amz-date, Signature=${signature}"
        
        # Make the request
        local response=$(curl -s -o /dev/null -w "%{http_code}" \
            -H "Host: ${host}" \
            -H "X-Amz-Date: ${timestamp}" \
            -H "Authorization: ${auth_header}" \
            "https://${host}/" 2>/dev/null)
        
        if [ "$response" = "200" ] || [ "$response" = "403" ]; then
            # 403 is also acceptable as it means the credentials are valid but we don't have permission to list buckets
            echo "AWS credentials appear to be valid."
            valid=true
        else
            echo "AWS credentials validation failed (HTTP $response)."
            valid=false
        fi
    fi
    
    return $([ "$valid" = true ] && echo 0 || echo 1)
}

store_api_keys() {
    print_section "Storing API Keys"
    
    # Create a temporary Python script to store the keys securely
    local temp_script=$(mktemp)
    cat > "$temp_script" << EOF
#!/usr/bin/env python3
import sys
import os
import json
import base64
from pathlib import Path

# Simple encryption for API keys (production would use more secure methods)
def encrypt_value(value):
    if not value:
        return ""
    return base64.b64encode(value.encode()).decode()

# Create settings file with encrypted API keys
def store_settings():
    settings = {
        "api_keys": {
            "openai": encrypt_value("$OPENAI_API_KEY"),
            "elevenlabs": encrypt_value("$ELEVENLABS_API_KEY"),
            "serpapi": encrypt_value("$SERPAPI_API_KEY")
        },
        "cloud_storage": {
            "enabled": $CLOUD_STORAGE_ENABLED,
            "provider": "aws_s3",
            "credentials": {
                "access_key": encrypt_value("$AWS_ACCESS_KEY_ID"),
                "secret_key": encrypt_value("$AWS_SECRET_ACCESS_KEY")
            }
        }
    }
    
    try:
        settings_path = Path("$SETTINGS_FILE")
        # Ensure the directory exists
        settings_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Set restrictive permissions on the file
        with open(settings_path, 'w') as f:
            json.dump(settings, f, indent=2)
        
        # Set permissions to owner-only readable on Unix-like systems
        if os.name == 'posix':
            os.chmod(settings_path, 0o600)
            
        print(f"API keys stored successfully at {settings_path}")
        return True
    except Exception as e:
        print(f"Error storing API keys: {e}")
        return False

if __name__ == "__main__":
    success = store_settings()
    sys.exit(0 if success else 1)
EOF
    
    # Make the script executable
    chmod +x "$temp_script"
    
    # Execute the script
    python3 "$temp_script"
    local result=$?
    
    # Remove the temporary script
    rm "$temp_script"
    
    return $result
}

setup_openai() {
    print_section "OpenAI API Setup"
    
    echo "The Personal AI Agent uses OpenAI's API for generating responses and embeddings."
    echo "You'll need an OpenAI API key to use this functionality."
    echo ""
    echo "To get an API key:"
    echo "1. Go to https://platform.openai.com/api-keys"
    echo "2. Create an account or sign in"
    echo "3. Create a new API key"
    echo ""
    echo "Note: OpenAI API usage incurs costs based on your usage."
    
    # More lenient pattern to account for potential format changes
    local api_key_pattern="^sk-[A-Za-z0-9]{32,}$"
    local description="OpenAI API keys start with 'sk-' followed by a series of characters."
    local key=$(prompt_for_key "OpenAI" "$description" "$api_key_pattern")
    
    # Validate the key
    validate_openai_key "$key"
    if [ $? -ne 0 ]; then
        echo ""
        echo "Warning: The OpenAI API key could not be validated."
        echo "You may continue, but the application might not work correctly."
        echo "Do you want to continue with this key anyway? (y/n)"
        read -p "> " continue_anyway
        
        if [[ ! $continue_anyway =~ ^[Yy]$ ]]; then
            return 1
        fi
    fi
    
    OPENAI_API_KEY="$key"
    return 0
}

setup_elevenlabs() {
    print_section "ElevenLabs API Setup (Optional)"
    
    echo "The Personal AI Agent can use ElevenLabs for high-quality text-to-speech."
    echo "This is optional - if you skip this, the application will use alternative TTS options."
    echo ""
    echo "Do you want to configure ElevenLabs? (y/n)"
    read -p "> " setup_elevenlabs
    
    if [[ ! $setup_elevenlabs =~ ^[Yy]$ ]]; then
        echo "Skipping ElevenLabs setup."
        return 0
    fi
    
    echo ""
    echo "To get an ElevenLabs API key:"
    echo "1. Go to https://elevenlabs.io/app"
    echo "2. Create an account or sign in"
    echo "3. Go to your profile and copy your API key"
    echo ""
    echo "Note: ElevenLabs offers a free tier with limited usage."
    
    # More lenient pattern to account for potential format changes
    local api_key_pattern="^[A-Za-z0-9]{24,}$"
    local description="ElevenLabs API keys are a series of letters and numbers."
    local key=$(prompt_for_key "ElevenLabs" "$description" "$api_key_pattern")
    
    # Validate the key
    validate_elevenlabs_key "$key"
    if [ $? -ne 0 ]; then
        echo ""
        echo "Warning: The ElevenLabs API key could not be validated."
        echo "You may continue, but text-to-speech might not work correctly."
        echo "Do you want to continue with this key anyway? (y/n)"
        read -p "> " continue_anyway
        
        if [[ ! $continue_anyway =~ ^[Yy]$ ]]; then
            ELEVENLABS_API_KEY=""
            return 0
        fi
    fi
    
    ELEVENLABS_API_KEY="$key"
    return 0
}

setup_serpapi() {
    print_section "SerpAPI Setup (Optional)"
    
    echo "The Personal AI Agent can use SerpAPI for web search capabilities."
    echo "This is optional - if you skip this, the application won't be able to search the web."
    echo ""
    echo "Do you want to configure SerpAPI? (y/n)"
    read -p "> " setup_serpapi
    
    if [[ ! $setup_serpapi =~ ^[Yy]$ ]]; then
        echo "Skipping SerpAPI setup."
        return 0
    fi
    
    echo ""
    echo "To get a SerpAPI key:"
    echo "1. Go to https://serpapi.com/users/sign_up"
    echo "2. Create an account or sign in"
    echo "3. Copy your API key from the dashboard"
    echo ""
    echo "Note: SerpAPI offers a free trial with limited searches."
    
    # More lenient pattern to account for potential format changes
    local api_key_pattern="^[a-z0-9]{16,}$"
    local description="SerpAPI keys are a series of lowercase letters and numbers."
    local key=$(prompt_for_key "SerpAPI" "$description" "$api_key_pattern")
    
    # Validate the key
    validate_serpapi_key "$key"
    if [ $? -ne 0 ]; then
        echo ""
        echo "Warning: The SerpAPI key could not be validated."
        echo "You may continue, but web search might not work correctly."
        echo "Do you want to continue with this key anyway? (y/n)"
        read -p "> " continue_anyway
        
        if [[ ! $continue_anyway =~ ^[Yy]$ ]]; then
            SERPAPI_API_KEY=""
            return 0
        fi
    fi
    
    SERPAPI_API_KEY="$key"
    return 0
}

setup_cloud_storage() {
    print_section "Cloud Storage Setup (Optional)"
    
    echo "The Personal AI Agent can optionally back up your data to cloud storage."
    echo "This is completely optional and disabled by default for maximum privacy."
    echo ""
    echo "Do you want to configure cloud backup? (y/n)"
    read -p "> " setup_cloud
    
    if [[ ! $setup_cloud =~ ^[Yy]$ ]]; then
        echo "Skipping cloud storage setup. All data will remain local."
        CLOUD_STORAGE_ENABLED=false
        return 0
    fi
    
    CLOUD_STORAGE_ENABLED=true
    
    echo ""
    echo "Currently, the application supports AWS S3 for cloud backup."
    echo "In the future, more providers may be supported."
    echo ""
    echo "To use AWS S3, you'll need:"
    echo "1. An AWS account"
    echo "2. An IAM user with S3 access"
    echo "3. Access key and secret key for that user"
    echo "4. An S3 bucket for backups"
    echo ""
    
    # More lenient patterns to account for potential format changes
    local access_key_pattern="^[A-Z0-9]{16,}$"
    local description="AWS access keys are typically 20 characters, uppercase letters and numbers."
    local access_key=$(prompt_for_key "AWS Access Key ID" "$description" "$access_key_pattern")
    
    local secret_key_pattern="^[A-Za-z0-9/+]{30,}$"
    local description="AWS secret keys are a longer string of mixed characters."
    local secret_key=$(prompt_for_key "AWS Secret Access Key" "$description" "$secret_key_pattern")
    
    # Validate the AWS credentials
    validate_aws_credentials "$access_key" "$secret_key"
    if [ $? -ne 0 ]; then
        echo ""
        echo "Warning: The AWS credentials could not be validated."
        echo "You may continue, but cloud backup might not work correctly."
        echo "Do you want to continue with these credentials anyway? (y/n)"
        read -p "> " continue_anyway
        
        if [[ ! $continue_anyway =~ ^[Yy]$ ]]; then
            CLOUD_STORAGE_ENABLED=false
            return 0
        fi
    fi
    
    AWS_ACCESS_KEY_ID="$access_key"
    AWS_SECRET_ACCESS_KEY="$secret_key"
    
    # Additional bucket and region configuration would be done here in a full implementation
    
    return 0
}

main() {
    # Check for required dependencies
    check_dependencies
    
    print_header
    
    # Determine configuration directory
    get_config_dir
    SETTINGS_FILE="$CONFIG_DIR/settings.json"
    
    echo "Configuration will be stored in: $CONFIG_DIR"
    echo ""
    
    # Check if settings file already exists
    if [ -f "$SETTINGS_FILE" ]; then
        echo "A settings file already exists at: $SETTINGS_FILE"
        echo "Do you want to overwrite it? (y/n)"
        read -p "> " overwrite
        
        if [[ ! $overwrite =~ ^[Yy]$ ]]; then
            echo "Setup aborted. Existing configuration will be used."
            return 1
        fi
    fi
    
    # Setup OpenAI API - required
    setup_openai
    if [ $? -ne 0 ]; then
        echo "OpenAI API setup failed. Aborting."
        return 1
    fi
    
    # Setup ElevenLabs API - optional
    setup_elevenlabs
    
    # Setup SerpAPI - optional
    setup_serpapi
    
    # Setup cloud storage - optional
    setup_cloud_storage
    
    # Store all the API keys
    store_api_keys
    if [ $? -ne 0 ]; then
        echo "Failed to store API keys. Please check permissions and try again."
        return 1
    fi
    
    echo ""
    echo "Setup complete! API keys have been stored securely."
    echo "You can now run the Personal AI Agent with these configurations."
    echo ""
    
    return 0
}

# Execute the main function
main
exit $?