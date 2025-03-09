#!/bin/bash
# backup.sh - Command-line interface for Personal AI Agent backup management
# This script provides functionality to create, manage and schedule backups

# Global variables
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../..")
PYTHON_EXECUTABLE=python3
BACKUP_SCRIPT=$PROJECT_ROOT/src/backend/scripts/backup_manager.py
DEFAULT_BACKUP_DIR=$PROJECT_ROOT/backups
LOG_FILE=$PROJECT_ROOT/logs/backup.log
VERBOSE=false

# Print usage information
print_usage() {
    echo "backup.sh - Command-line interface for Personal AI Agent backup management"
    echo ""
    echo "Usage: backup.sh [command] [options]"
    echo ""
    echo "Commands:"
    echo "  create      Create a new backup"
    echo "  list        List available backups"
    echo "  delete      Delete a specific backup"
    echo "  schedule    Set up scheduled automatic backups"
    echo "  verify      Verify the integrity of a backup"
    echo "  cleanup     Remove old backups based on retention policy"
    echo ""
    echo "Global options:"
    echo "  -v, --verbose         Show verbose output"
    echo ""
    echo "Options for 'create':"
    echo "  -n, --name NAME        Backup name (default: auto-generated timestamp)"
    echo "  -f, --include-files    Include files in the backup"
    echo "  -e, --encrypt          Encrypt the backup"
    echo "  -c, --cloud            Upload backup to cloud storage"
    echo ""
    echo "Options for 'list':"
    echo "  -c, --cloud            Include cloud backups in listing"
    echo ""
    echo "Options for 'delete':"
    echo "  -n, --name NAME        Backup name (required)"
    echo "  -c, --cloud            Delete from cloud storage also"
    echo ""
    echo "Options for 'schedule':"
    echo "  -f, --frequency FREQ   Frequency (daily, weekly, monthly)"
    echo "  -i, --include-files    Include files in the backup"
    echo "  -e, --encrypt          Encrypt the backup"
    echo "  -c, --cloud            Upload backup to cloud storage"
    echo "  -r, --retention COUNT  Number of backups to retain"
    echo ""
    echo "Options for 'verify':"
    echo "  -p, --path PATH        Path to backup file (required)"
    echo ""
    echo "Options for 'cleanup':"
    echo "  -m, --max-backups N    Maximum number of backups to keep"
    echo "  -c, --cloud            Clean up cloud backups also"
    echo ""
    echo "Examples:"
    echo "  backup.sh create --name weekly-backup --encrypt"
    echo "  backup.sh list --cloud"
    echo "  backup.sh schedule --frequency daily --encrypt --cloud --retention 7"
    echo "  backup.sh verify --path /path/to/backup.tar.gz"
    echo ""
    echo "For more information, see the documentation."
}

# Set up necessary directories and environment
setup_environment() {
    # Create logs directory if it doesn't exist
    if [ ! -d "$PROJECT_ROOT/logs" ]; then
        mkdir -p "$PROJECT_ROOT/logs"
        if [ $? -ne 0 ]; then
            echo "Error: Failed to create logs directory"
            return 1
        fi
    fi

    # Create backups directory if it doesn't exist
    if [ ! -d "$DEFAULT_BACKUP_DIR" ]; then
        mkdir -p "$DEFAULT_BACKUP_DIR"
        if [ $? -ne 0 ]; then
            echo "Error: Failed to create backups directory"
            return 1
        fi
    fi

    # Check if Python executable exists
    if ! command -v $PYTHON_EXECUTABLE &> /dev/null; then
        echo "Error: Python executable not found"
        return 1
    fi

    # Check if backup script exists
    if [ ! -f "$BACKUP_SCRIPT" ]; then
        echo "Error: Backup script not found at $BACKUP_SCRIPT"
        return 1
    fi

    # Check for required Python modules
    $PYTHON_EXECUTABLE -c "import cryptography, datetime, os, sys, json" &> /dev/null
    if [ $? -ne 0 ]; then
        echo "Error: Required Python modules not installed. Please run setup.py first."
        return 1
    fi

    return 0
}

# Log a message to the log file with timestamp
log_message() {
    local message="$1"
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    echo "[$timestamp] $message" >> "$LOG_FILE"
    
    if [ "$VERBOSE" = true ]; then
        echo "[$timestamp] $message"
    fi
}

# Create a new backup
create_backup() {
    local backup_name="$1"
    local include_files="$2"
    local encrypt="$3"
    local upload_to_cloud="$4"
    
    log_message "Creating backup: $backup_name"
    
    # Build command
    local cmd="$PYTHON_EXECUTABLE $BACKUP_SCRIPT create"
    
    if [ -n "$backup_name" ]; then
        cmd="$cmd --name $backup_name"
    fi
    
    if [ "$include_files" = true ]; then
        cmd="$cmd --include-files"
    fi
    
    if [ "$encrypt" = true ]; then
        cmd="$cmd --encrypt"
    fi
    
    if [ "$upload_to_cloud" = true ]; then
        cmd="$cmd --cloud"
    fi
    
    # Execute command
    eval $cmd
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_message "Backup created successfully"
    else
        log_message "Failed to create backup (exit code: $exit_code)"
    fi
    
    return $exit_code
}

# List available backups
list_backups() {
    local include_cloud="$1"
    
    log_message "Listing backups"
    
    # Build command
    local cmd="$PYTHON_EXECUTABLE $BACKUP_SCRIPT list"
    
    if [ "$include_cloud" = true ]; then
        cmd="$cmd --cloud"
    fi
    
    # Execute command
    eval $cmd
    return $?
}

# Delete a backup
delete_backup() {
    local backup_name="$1"
    local delete_from_cloud="$2"
    
    log_message "Deleting backup: $backup_name"
    
    # Ask for confirmation
    read -p "Are you sure you want to delete backup '$backup_name'? [y/N] " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_message "Backup deletion cancelled by user"
        return 1
    fi
    
    # Build command
    local cmd="$PYTHON_EXECUTABLE $BACKUP_SCRIPT delete --name $backup_name"
    
    if [ "$delete_from_cloud" = true ]; then
        cmd="$cmd --cloud"
    fi
    
    # Execute command
    eval $cmd
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_message "Backup deleted successfully"
    else
        log_message "Failed to delete backup (exit code: $exit_code)"
    fi
    
    return $exit_code
}

# Schedule automatic backups
schedule_backup() {
    local frequency="$1"
    local include_files="$2"
    local encrypt="$3"
    local upload_to_cloud="$4"
    local retention_count="$5"
    
    log_message "Scheduling backup with frequency: $frequency"
    
    # Validate frequency
    if [[ ! "$frequency" =~ ^(daily|weekly|monthly)$ ]]; then
        log_message "Invalid frequency: $frequency (must be daily, weekly, or monthly)"
        return 1
    fi
    
    # Build command
    local cmd="$PYTHON_EXECUTABLE $BACKUP_SCRIPT schedule --frequency $frequency"
    
    if [ "$include_files" = true ]; then
        cmd="$cmd --include-files"
    fi
    
    if [ "$encrypt" = true ]; then
        cmd="$cmd --encrypt"
    fi
    
    if [ "$upload_to_cloud" = true ]; then
        cmd="$cmd --cloud"
    fi
    
    if [ -n "$retention_count" ]; then
        cmd="$cmd --retention $retention_count"
    fi
    
    # Execute command
    eval $cmd
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_message "Backup schedule set successfully"
    else
        log_message "Failed to set backup schedule (exit code: $exit_code)"
    fi
    
    return $exit_code
}

# Verify backup integrity
verify_backup() {
    local backup_path="$1"
    
    log_message "Verifying backup: $backup_path"
    
    # Ensure backup path exists
    if [ ! -f "$backup_path" ]; then
        log_message "Error: Backup file does not exist at $backup_path"
        return 1
    fi
    
    # Build command
    local cmd="$PYTHON_EXECUTABLE $BACKUP_SCRIPT verify --path \"$backup_path\""
    
    # Execute command
    eval $cmd
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_message "Backup verification successful"
    else
        log_message "Backup verification failed (exit code: $exit_code)"
    fi
    
    return $exit_code
}

# Clean up old backups
cleanup_old_backups() {
    local max_backups="$1"
    local include_cloud="$2"
    
    log_message "Cleaning up old backups, keeping max $max_backups"
    
    # Build command
    local cmd="$PYTHON_EXECUTABLE $BACKUP_SCRIPT cleanup --max-backups $max_backups"
    
    if [ "$include_cloud" = true ]; then
        cmd="$cmd --cloud"
    fi
    
    # Execute command
    eval $cmd
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        log_message "Backup cleanup successful"
    else
        log_message "Backup cleanup failed (exit code: $exit_code)"
    fi
    
    return $exit_code
}

# Parse command line arguments
parse_arguments() {
    local args=("$@")
    
    # Check if no arguments provided
    if [ ${#args[@]} -eq 0 ]; then
        print_usage
        return 1
    fi
    
    # Remove verbose flag if present
    local filtered_args=()
    for arg in "${args[@]}"; do
        if [ "$arg" != "-v" ] && [ "$arg" != "--verbose" ]; then
            filtered_args+=("$arg")
        fi
    done
    
    # If no arguments left after filtering verbose flag
    if [ ${#filtered_args[@]} -eq 0 ]; then
        print_usage
        return 1
    fi
    
    # Get command
    local command="${filtered_args[0]}"
    
    # Remove command from arguments
    filtered_args=("${filtered_args[@]:1}")
    
    case "$command" in
        create)
            local backup_name=""
            local include_files=false
            local encrypt=false
            local upload_to_cloud=false
            
            while [[ ${#filtered_args[@]} -gt 0 ]]; do
                case "${filtered_args[0]}" in
                    -n|--name)
                        backup_name="${filtered_args[1]}"
                        filtered_args=("${filtered_args[@]:2}")
                        ;;
                    -f|--include-files)
                        include_files=true
                        filtered_args=("${filtered_args[@]:1}")
                        ;;
                    -e|--encrypt)
                        encrypt=true
                        filtered_args=("${filtered_args[@]:1}")
                        ;;
                    -c|--cloud)
                        upload_to_cloud=true
                        filtered_args=("${filtered_args[@]:1}")
                        ;;
                    *)
                        echo "Unknown option for create command: ${filtered_args[0]}"
                        print_usage
                        return 1
                        ;;
                esac
            done
            
            create_backup "$backup_name" "$include_files" "$encrypt" "$upload_to_cloud"
            return $?
            ;;
            
        list)
            local include_cloud=false
            
            while [[ ${#filtered_args[@]} -gt 0 ]]; do
                case "${filtered_args[0]}" in
                    -c|--cloud)
                        include_cloud=true
                        filtered_args=("${filtered_args[@]:1}")
                        ;;
                    *)
                        echo "Unknown option for list command: ${filtered_args[0]}"
                        print_usage
                        return 1
                        ;;
                esac
            done
            
            list_backups "$include_cloud"
            return $?
            ;;
            
        delete)
            local backup_name=""
            local delete_from_cloud=false
            
            while [[ ${#filtered_args[@]} -gt 0 ]]; do
                case "${filtered_args[0]}" in
                    -n|--name)
                        backup_name="${filtered_args[1]}"
                        filtered_args=("${filtered_args[@]:2}")
                        ;;
                    -c|--cloud)
                        delete_from_cloud=true
                        filtered_args=("${filtered_args[@]:1}")
                        ;;
                    *)
                        echo "Unknown option for delete command: ${filtered_args[0]}"
                        print_usage
                        return 1
                        ;;
                esac
            done
            
            if [ -z "$backup_name" ]; then
                echo "Error: Backup name is required for delete command"
                print_usage
                return 1
            fi
            
            delete_backup "$backup_name" "$delete_from_cloud"
            return $?
            ;;
            
        schedule)
            local frequency=""
            local include_files=false
            local encrypt=false
            local upload_to_cloud=false
            local retention_count=""
            
            while [[ ${#filtered_args[@]} -gt 0 ]]; do
                case "${filtered_args[0]}" in
                    -f|--frequency)
                        frequency="${filtered_args[1]}"
                        filtered_args=("${filtered_args[@]:2}")
                        ;;
                    -i|--include-files)
                        include_files=true
                        filtered_args=("${filtered_args[@]:1}")
                        ;;
                    -e|--encrypt)
                        encrypt=true
                        filtered_args=("${filtered_args[@]:1}")
                        ;;
                    -c|--cloud)
                        upload_to_cloud=true
                        filtered_args=("${filtered_args[@]:1}")
                        ;;
                    -r|--retention)
                        retention_count="${filtered_args[1]}"
                        filtered_args=("${filtered_args[@]:2}")
                        ;;
                    *)
                        echo "Unknown option for schedule command: ${filtered_args[0]}"
                        print_usage
                        return 1
                        ;;
                esac
            done
            
            if [ -z "$frequency" ]; then
                echo "Error: Frequency is required for schedule command"
                print_usage
                return 1
            fi
            
            schedule_backup "$frequency" "$include_files" "$encrypt" "$upload_to_cloud" "$retention_count"
            return $?
            ;;
            
        verify)
            local backup_path=""
            
            while [[ ${#filtered_args[@]} -gt 0 ]]; do
                case "${filtered_args[0]}" in
                    -p|--path)
                        backup_path="${filtered_args[1]}"
                        filtered_args=("${filtered_args[@]:2}")
                        ;;
                    *)
                        echo "Unknown option for verify command: ${filtered_args[0]}"
                        print_usage
                        return 1
                        ;;
                esac
            done
            
            if [ -z "$backup_path" ]; then
                echo "Error: Backup path is required for verify command"
                print_usage
                return 1
            fi
            
            verify_backup "$backup_path"
            return $?
            ;;
            
        cleanup)
            local max_backups=""
            local include_cloud=false
            
            while [[ ${#filtered_args[@]} -gt 0 ]]; do
                case "${filtered_args[0]}" in
                    -m|--max-backups)
                        max_backups="${filtered_args[1]}"
                        filtered_args=("${filtered_args[@]:2}")
                        ;;
                    -c|--cloud)
                        include_cloud=true
                        filtered_args=("${filtered_args[@]:1}")
                        ;;
                    *)
                        echo "Unknown option for cleanup command: ${filtered_args[0]}"
                        print_usage
                        return 1
                        ;;
                esac
            done
            
            if [ -z "$max_backups" ]; then
                echo "Error: Maximum number of backups is required for cleanup command"
                print_usage
                return 1
            fi
            
            cleanup_old_backups "$max_backups" "$include_cloud"
            return $?
            ;;
            
        help|-h|--help)
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

# Main entry point
main() {
    # Setup environment
    setup_environment
    if [ $? -ne 0 ]; then
        echo "Failed to set up environment"
        return 1
    fi
    
    # Check for verbose flag
    for arg in "$@"; do
        if [ "$arg" = "-v" ] || [ "$arg" = "--verbose" ]; then
            VERBOSE=true
            break
        fi
    done
    
    # Parse arguments and execute command
    parse_arguments "$@"
    return $?
}

# Execute main function with all arguments
main "$@"
exit $?