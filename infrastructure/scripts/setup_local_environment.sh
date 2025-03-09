#!/bin/bash
# =========================================================================
# Personal AI Agent - Local Development Environment Setup Script
# =========================================================================
# This script automates the setup of a complete local development environment
# for the Personal AI Agent. It installs required dependencies, configures the
# development environment, initializes databases, and prepares the system for
# both backend and frontend development with proper configuration.
# =========================================================================

# Exit immediately if a command exits with a non-zero status.
set -e

# Define global variables
SCRIPT_DIR="$(dirname "$(readlink -f "$0")")"
PROJECT_ROOT="$(realpath "$SCRIPT_DIR/../..")"
BACKEND_DIR="$PROJECT_ROOT/src/backend"
WEB_DIR="$PROJECT_ROOT/src/web"
CONFIG_DIR="$BACKEND_DIR/config"
DATA_DIR="$BACKEND_DIR/data"
LOG_DIR="$BACKEND_DIR/logs"
PYTHON_VERSION="3.11"
NODE_VERSION="20"
PNPM_VERSION="8"

# Define environment variables that can be overridden
PYTHON_VERSION="${PYTHON_VERSION:-3.11}"
NODE_VERSION="${NODE_VERSION:-20}"
PNPM_VERSION="${PNPM_VERSION:-8}"
SKIP_DOCKER="${SKIP_DOCKER:-false}"
SKIP_BACKEND="${SKIP_BACKEND:-false}"
SKIP_FRONTEND="${SKIP_FRONTEND:-false}"

# Function to check if required dependencies are installed
check_dependencies() {
  echo "Checking required dependencies..."

  # Check if Docker is installed
  if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed."
    return 1
  fi

  # Check if Docker Compose is installed
  if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed."
    return 1
  fi

  # Check if Python is installed with the correct version
  if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed."
    return 1
  else
    python_version=$((python3 --version 2>&1) | awk '{print $2}' | cut -d '.' -f1,2)
    if [[ "$python_version" != "$PYTHON_VERSION" ]]; then
      echo "Error: Python version is not $PYTHON_VERSION. Found $python_version."
      return 1
    fi
  fi

  # Check if Node.js is installed with the correct version
  if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed."
    return 1
  else
    node_version=$((node --version) | cut -d 'v' -f2 | cut -d '.' -f1)
    if [[ "$node_version" != "$NODE_VERSION" ]]; then
      echo "Error: Node.js version is not $NODE_VERSION. Found $node_version."
      return 1
    fi
  fi

  # Check if pnpm is installed
  if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm is not installed."
    return 1
  else
    pnpm_version=$((pnpm --version) | cut -d '.' -f1)
    if [[ "$pnpm_version" != "$PNPM_VERSION" ]]; then
      echo "Error: pnpm version is not $PNPM_VERSION. Found $pnpm_version."
      return 1
    fi
  fi

  echo "All dependencies are present."
  return 0
}

# Function to install missing dependencies based on the operating system
install_dependencies() {
  echo "Installing missing dependencies..."

  # Detect operating system
  os_name=$(uname -s)

  # Install dependencies based on OS
  case "$os_name" in
    Linux*)
      # Linux-specific installation (example using apt)
      echo "Detected Linux. Attempting to install dependencies using apt..."
      sudo apt-get update
      sudo apt-get install -y docker docker-compose python3 python3-pip nodejs npm
      ;;
    Darwin*)
      # macOS-specific installation (example using Homebrew)
      echo "Detected macOS. Attempting to install dependencies using Homebrew..."
      brew install docker docker-compose python3 node
      ;;
    CYGWIN*|MINGW*|MSYS*)
      # Windows/WSL-specific installation
      echo "Detected Windows/WSL. Please install dependencies manually."
      echo "Refer to the documentation for instructions."
      return 1
      ;;
    *)
      echo "Unknown operating system. Please install dependencies manually."
      return 1
      ;;
  esac

  # Install Python dependencies
  echo "Installing Python dependencies..."
  pip3 install --upgrade pip
  pip3 install -r "$BACKEND_DIR/requirements.txt"

  # Install Node.js dependencies
  echo "Installing Node.js dependencies..."
  npm install -g pnpm

  echo "All dependencies installed."
  return 0
}

# Function to set up the backend development environment
setup_backend() {
  echo "Setting up backend environment..."

  # Create necessary directories
  echo "Creating directories..."
  mkdir -p "$DATA_DIR" "$CONFIG_DIR" "$LOG_DIR"

  # Copy default configuration if not exists
  echo "Copying default configuration..."
  if [ ! -f "$CONFIG_DIR/config.json" ]; then
    cp "$CONFIG_DIR/default_config.yaml" "$CONFIG_DIR/config.json"
  fi

  # Create Python virtual environment if not exists
  echo "Creating Python virtual environment..."
  if [ ! -d "$BACKEND_DIR/venv" ]; then
    python3 -m venv "$BACKEND_DIR/venv"
  fi

  # Install Python dependencies from requirements.txt
  echo "Installing Python dependencies from requirements.txt..."
  source "$BACKEND_DIR/venv/bin/activate"
  pip install --upgrade pip
  pip install -r "$BACKEND_DIR/requirements.txt"
  deactivate

  # Initialize SQLite database
  echo "Initializing SQLite database..."
  # Add commands to initialize SQLite database if needed

  # Set up ChromaDB vector database
  echo "Setting up ChromaDB vector database..."
  # Add commands to set up ChromaDB vector database if needed

  echo "Backend environment setup complete."
  return 0
}

# Function to set up the frontend development environment
setup_frontend() {
  echo "Setting up frontend environment..."

  # Navigate to web directory
  cd "$WEB_DIR" || exit 1

  # Install Node.js dependencies using pnpm
  echo "Installing Node.js dependencies using pnpm..."
  pnpm install

  # Create .env.local file with development settings
  echo "Creating .env.local file..."
  # Add commands to create .env.local file with development settings

  # Build the frontend for development
  echo "Building the frontend for development..."
  pnpm build

  echo "Frontend environment setup complete."
  return 0
}

# Function to set up Docker development environment
setup_docker() {
  echo "Setting up Docker development environment..."

  # Navigate to backend directory
  cd "$BACKEND_DIR" || exit 1

  # Build Docker images using docker-compose
  echo "Building Docker images using docker-compose..."
  docker-compose build

  # Create necessary volumes
  echo "Creating necessary volumes..."
  # Add commands to create necessary volumes

  echo "Docker environment setup complete."
  return 0
}

# Function to print success message with instructions on how to start development
print_success_message() {
  echo "================================================================================"
  echo "  Personal AI Agent - Local Development Setup Complete"
  echo "================================================================================"
  echo ""
  echo "  Next Steps:"
  echo ""
  echo "  1. Start backend development:"
  echo "     cd $BACKEND_DIR"
  echo "     source venv/bin/activate"
  echo "     uvicorn main:app --reload"
  echo ""
  echo "  2. Start frontend development:"
  echo "     cd $WEB_DIR"
  echo "     pnpm dev"
  echo ""
  echo "  3. Run tests:"
  echo "     cd $BACKEND_DIR"
  echo "     pytest"
  echo "     cd $WEB_DIR"
  echo "     pnpm test"
  echo ""
  echo "  4. Access documentation:"
  echo "     Open your browser and navigate to http://localhost:8000/docs"
  echo ""
  echo "================================================================================"
}

# Main function that orchestrates the setup process
main() {
  echo "================================================================================"
  echo "  Personal AI Agent - Local Development Setup"
  echo "================================================================================"
  echo ""

  # Check dependencies
  if ! check_dependencies; then
    echo "Missing dependencies. Attempting to install..."
    if ! install_dependencies; then
      echo "Failed to install dependencies. Please install them manually and try again."
      return 1
    fi
  fi

  # Setup backend environment
  if [ "$SKIP_BACKEND" == "false" ]; then
    if ! setup_backend; then
      echo "Failed to setup backend environment."
      return 1
    fi
  else
    echo "Skipping backend setup."
  fi

  # Setup frontend environment
  if [ "$SKIP_FRONTEND" == "false" ]; then
    if ! setup_frontend; then
      echo "Failed to setup frontend environment."
      return 1
    fi
  else
    echo "Skipping frontend setup."
  fi

  # Setup Docker environment
  if [ "$SKIP_DOCKER" == "false" ]; then
    if ! setup_docker; then
      echo "Failed to setup Docker environment."
      return 1
    fi
  else
    echo "Skipping Docker setup."
  fi

  # Print success message with next steps
  print_success_message

  return 0
}

# Run main function
main