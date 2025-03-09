#!/bin/bash
# restore.sh - Personal AI Agent Backup Restoration Script
# This script provides a command-line interface for restoring the Personal AI Agent
# from local or cloud backups, managing the application lifecycle during restore.

# Global variables
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../..")
PYTHON_EXECUTABLE=python3
BACKUP_SCRIPT=$PROJECT_ROOT/src/backend/scripts/backup_manager.py
DEFAULT_BACKUP_DIR=$PROJECT_ROOT/backups
LOG_FILE=$PROJECT_ROOT/logs/restore.log
VERBOSE=false

# Helper functions

# Displays usage information for the restore script
print_usage() {
    echo "Personal AI Agent Restore Script"
    echo "--------------------------------"
    echo "This script provides functionality to restore your Personal AI Agent from backups."
    echo ""
    echo "Usage: restore.sh COMMAND [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  restore  Restore data from a backup"
    echo "  list     List available backups"
    echo "  verify   Verify the integrity of a backup"
    echo ""
    echo "Options for 'restore':"
    echo "  -b, --backup PATH       Path to backup file (required)"
    echo "  -d, --decrypt           Decrypt the backup (required for encrypted backups)"
    echo "  -c, --cloud             Download backup from cloud storage first"
    echo "  -p, --password PASS     Password for encrypted backup"
    echo "  -f, --force             Skip confirmation prompt"
    echo "  -v, --verbose           Show detailed output"
    echo ""
    echo "Options for 'list':"
    echo "  -c, --cloud             Include cloud backups in listing"
    echo "  -v, --verbose           Show detailed output"
    echo ""
    echo "Options for 'verify':"
    echo "  -b, --backup PATH       Path to backup file (required)"
    echo "  -v, --verbose           Show detailed output"
    echo ""
    echo "Examples:"
    echo "  restore.sh restore -b ./backups/backup_20230615.tar.gz"
    echo "  restore.sh restore -b ./backups/backup_encrypted.tar.gz.enc -d -p mypassword"
    echo "  restore.sh list -c"
    echo "  restore.sh verify -b ./backups/backup_20230615.tar.gz"
    echo ""
    echo "For additional help, please refer to the documentation."
}

# Ensures the necessary directories exist and sets up the environment
setup_environment() {
    # Create logs directory if it doesn't exist
    mkdir -p "$PROJECT_ROOT/logs"
    
    # Check if Python executable exists
    if ! command -v $PYTHON_EXECUTABLE &> /dev/null; then
        echo "Error: Python executable not found. Please ensure Python is installed."
        return 1
    fi
    
    # Check if backup script exists
    if [ ! -f "$BACKUP_SCRIPT" ]; then
        echo "Error: Backup script not found at $BACKUP_SCRIPT"
        return 1
    fi
    
    # Create backups directory if it doesn't exist
    mkdir -p "$DEFAULT_BACKUP_DIR"
    
    return 0
}

# Logs a message to the log file with timestamp
log_message() {
    local message="$1"
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] $message" >> "$LOG_FILE"
    
    if [ "$VERBOSE" = true ]; then
        echo "[$timestamp] $message"
    fi
}

# Checks if the Personal AI Agent is currently running
check_application_status() {
    # Check for running processes matching the application name
    if pgrep -f "Personal AI Agent" > /dev/null; then
        return 1  # Application is running
    else
        return 0  # Application is not running
    fi
}

# Stops the Personal AI Agent if it's running
stop_application() {
    log_message "Checking if application is running before restore..."
    
    if check_application_status; then
        log_message "Application is not running, proceeding with restore."
        return 0
    fi
    
    log_message "Application is running, attempting to stop it gracefully..."
    
    # Try graceful shutdown first
    pkill -TERM -f "Personal AI Agent"
    
    # Wait up to 10 seconds for graceful shutdown
    for i in {1..10}; do
        if check_application_status; then
            log_message "Application stopped successfully."
            return 0
        fi
        sleep 1
    done
    
    # Force kill if still running
    log_message "Graceful shutdown timed out, force stopping application..."
    pkill -KILL -f "Personal AI Agent"
    
    # Verify application stopped
    if check_application_status; then
        log_message "Application stopped successfully."
        return 0
    else
        log_message "ERROR: Failed to stop application."
        return 1
    fi
}

# Starts the Personal AI Agent after restore
start_application() {
    log_message "Attempting to start application after restore..."
    
    # Check if application is already running
    if ! check_application_status; then
        log_message "Application is already running."
        return 0
    fi
    
    # Start the application (this is a placeholder - actual command will depend on how the application is normally started)
    # For example, it might be something like:
    # nohup $PROJECT_ROOT/bin/personal_ai_agent > /dev/null 2>&1 &
    
    log_message "Application start command would be executed here."
    log_message "NOTE: Automatic restart is disabled. Please start the application manually."
    
    # Return success for now
    return 0
}

# Command functions

# Restores data from a specified backup
restore_backup() {
    local backup_path="$1"
    local decrypt="$2"
    local cloud="$3"
    local password="$4"
    local force="$5"
    
    log_message "Starting restore operation from backup: $backup_path"
    
    # Confirm restoration with user unless force flag is set
    if [ "$force" != true ]; then
        echo "WARNING: This will restore your Personal AI Agent data from the backup."
        echo "All current data will be replaced with the data from the backup."
        echo "Are you sure you want to continue? (y/N)"
        read -r confirm
        
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            log_message "Restore operation cancelled by user."
            echo "Restore operation cancelled."
            return 1
        fi
    fi
    
    # Stop any running application instances
    if ! stop_application; then
        log_message "WARNING: Failed to stop the application. Restore may not complete successfully."
        echo "WARNING: Failed to stop the application. Restore may not complete successfully."
    fi
    
    # Construct Python command with appropriate arguments
    cmd="$PYTHON_EXECUTABLE $BACKUP_SCRIPT restore --backup \"$backup_path\""
    
    if [ "$decrypt" = true ]; then
        cmd="$cmd --decrypt"
        
        if [ -n "$password" ]; then
            cmd="$cmd --password \"$password\""
        fi
    fi
    
    if [ "$cloud" = true ]; then
        cmd="$cmd --cloud"
    fi
    
    if [ "$VERBOSE" = true ]; then
        cmd="$cmd --verbose"
    fi
    
    log_message "Executing: $cmd"
    
    # Execute the Python backup script with restore command
    eval "$cmd"
    local result=$?
    
    if [ $result -eq 0 ]; then
        log_message "Restore completed successfully."
        echo "Restore completed successfully."
        
        # Start the application after successful restore
        start_application
    else
        log_message "ERROR: Restore failed with exit code $result."
        echo "ERROR: Restore failed with exit code $result."
    fi
    
    return $result
}

# Lists available backups from local and/or cloud storage
list_backups() {
    local include_cloud="$1"
    
    log_message "Listing available backups"
    
    # Construct Python command with appropriate arguments
    cmd="$PYTHON_EXECUTABLE $BACKUP_SCRIPT list"
    
    if [ "$include_cloud" = true ]; then
        cmd="$cmd --cloud"
    fi
    
    if [ "$VERBOSE" = true ]; then
        cmd="$cmd --verbose"
    fi
    
    log_message "Executing: $cmd"
    
    # Execute the Python backup script with list command
    eval "$cmd"
    local result=$?
    
    if [ $result -ne 0 ]; then
        log_message "ERROR: Listing backups failed with exit code $result."
    fi
    
    return $result
}

# Verifies the integrity of a backup
verify_backup() {
    local backup_path="$1"
    
    log_message "Starting verification of backup: $backup_path"
    
    # Construct Python command with appropriate arguments
    cmd="$PYTHON_EXECUTABLE $BACKUP_SCRIPT verify --backup \"$backup_path\""
    
    if [ "$VERBOSE" = true ]; then
        cmd="$cmd --verbose"
    fi
    
    log_message "Executing: $cmd"
    
    # Execute the Python backup script with verify command
    eval "$cmd"
    local result=$?
    
    if [ $result -eq 0 ]; then
        log_message "Backup verification successful. Backup is intact."
        echo "Backup verification successful. Backup is intact."
    else
        log_message "ERROR: Backup verification failed with exit code $result."
        echo "ERROR: Backup verification failed with exit code $result."
    fi
    
    return $result
}

# Parses command line arguments
parse_arguments() {
    # Default values
    local command=""
    local backup_path=""
    local decrypt=false
    local cloud=false
    local password=""
    local force=false
    
    # Check if we have at least one argument (the command)
    if [ $# -lt 1 ]; then
        print_usage
        return 1
    fi
    
    # Get the command
    command="$1"
    shift
    
    case "$command" in
        restore)
            # Parse restore command options
            while [ $# -gt 0 ]; do
                case "$1" in
                    -b|--backup)
                        backup_path="$2"
                        shift 2
                        ;;
                    -d|--decrypt)
                        decrypt=true
                        shift
                        ;;
                    -c|--cloud)
                        cloud=true
                        shift
                        ;;
                    -p|--password)
                        password="$2"
                        shift 2
                        ;;
                    -f|--force)
                        force=true
                        shift
                        ;;
                    -v|--verbose)
                        VERBOSE=true
                        shift
                        ;;
                    -h|--help)
                        print_usage
                        return 1
                        ;;
                    *)
                        echo "Unknown option: $1"
                        print_usage
                        return 1
                        ;;
                esac
            done
            
            # Validate required arguments
            if [ -z "$backup_path" ]; then
                echo "Error: Backup path is required for restore command."
                print_usage
                return 1
            fi
            
            # Execute restore command
            restore_backup "$backup_path" "$decrypt" "$cloud" "$password" "$force"
            return $?
            ;;
            
        list)
            # Parse list command options
            local include_cloud=false
            
            while [ $# -gt 0 ]; do
                case "$1" in
                    -c|--cloud)
                        include_cloud=true
                        shift
                        ;;
                    -v|--verbose)
                        VERBOSE=true
                        shift
                        ;;
                    -h|--help)
                        print_usage
                        return 1
                        ;;
                    *)
                        echo "Unknown option: $1"
                        print_usage
                        return 1
                        ;;
                esac
            done
            
            # Execute list command
            list_backups "$include_cloud"
            return $?
            ;;
            
        verify)
            # Parse verify command options
            while [ $# -gt 0 ]; do
                case "$1" in
                    -b|--backup)
                        backup_path="$2"
                        shift 2
                        ;;
                    -v|--verbose)
                        VERBOSE=true
                        shift
                        ;;
                    -h|--help)
                        print_usage
                        return 1
                        ;;
                    *)
                        echo "Unknown option: $1"
                        print_usage
                        return 1
                        ;;
                esac
            done
            
            # Validate required arguments
            if [ -z "$backup_path" ]; then
                echo "Error: Backup path is required for verify command."
                print_usage
                return 1
            fi
            
            # Execute verify command
            verify_backup "$backup_path"
            return $?
            ;;
            
        -h|--help)
            print_usage
            return 0
            ;;
            
        *)
            echo "Unknown command: $command"
            print_usage
            return 1
            ;;
    esac
}

# Main entry point for the script
main() {
    # Setup environment
    if ! setup_environment; then
        echo "Error: Failed to set up environment."
        exit 1
    fi
    
    # Parse command line arguments and execute appropriate command
    parse_arguments "$@"
    exit $?
}

# Call main function with all script arguments
main "$@"