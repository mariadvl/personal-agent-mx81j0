#!/bin/bash
# db_migration.sh - Database migration script for the Personal AI Agent
# This script automates database migration processes, ensuring safe schema evolution
# while preserving user data integrity.

# Set strict error handling
set -e

# Get script directory
SCRIPT_DIR=$(dirname "$(readlink -f "$0")")
PROJECT_ROOT=$(realpath "$SCRIPT_DIR/../..")
BACKEND_DIR=$PROJECT_ROOT/src/backend
MIGRATIONS_DIR=$BACKEND_DIR/database/migrations
DATA_DIR=$PROJECT_ROOT/data
BACKUP_DIR=$DATA_DIR/backups
LOG_DIR=$PROJECT_ROOT/logs
LOG_FILE=$LOG_DIR/db_migration.log
DEFAULT_DB_PATH=$DATA_DIR/personal_ai.db

# Ensure necessary directories exist
mkdir -p $DATA_DIR
mkdir -p $BACKUP_DIR
mkdir -p $LOG_DIR

# Enable verbose mode (0=disabled, 1=enabled)
VERBOSE=0

# Print script usage information
print_usage() {
    echo "Usage: $(basename $0) COMMAND [OPTIONS]"
    echo ""
    echo "Database migration script for the Personal AI Agent"
    echo ""
    echo "Commands:"
    echo "  migrate [--db PATH] [--to REVISION]   Migrate database to specified revision or latest"
    echo "  rollback [--db PATH] [--to REVISION]  Rollback database to specified revision"
    echo "  status [--db PATH]                    Show current migration status"
    echo "  backup [--db PATH] [--output PATH]    Create a backup of the database"
    echo "  verify [--db PATH]                    Verify database integrity"
    echo "  restore [--db PATH] [--from PATH]     Restore database from backup"
    echo ""
    echo "Options:"
    echo "  --db PATH          Path to SQLite database (default: $DEFAULT_DB_PATH)"
    echo "  --to REVISION      Target revision identifier (default: head for migrate, base for rollback)"
    echo "  --output PATH      Output path for backup file"
    echo "  --from PATH        Backup file to restore from"
    echo "  --verbose          Enable verbose output"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $(basename $0) migrate                # Migrate to latest version"
    echo "  $(basename $0) rollback --to abc123   # Rollback to specific revision"
    echo "  $(basename $0) status                 # Show current migration status"
    echo "  $(basename $0) backup --output /path/to/backup.db  # Create a backup"
    echo "  $(basename $0) restore --from /path/to/backup.db   # Restore from backup"
    echo ""
    echo "For more information, see the documentation."
}

# Log message to file and stdout if verbose
log_message() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local message="$timestamp - $1"
    echo "$message" >> "$LOG_FILE"
    if [ $VERBOSE -eq 1 ]; then
        echo "$message"
    fi
}

# Check if required tools are installed
check_prerequisites() {
    log_message "Checking prerequisites..."
    
    # Check for Python 3.11+
    if ! command -v python3 &> /dev/null; then
        log_message "ERROR: Python 3 is not installed"
        return 1
    fi
    
    local python_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
    if [[ $(echo "$python_version >= 3.11" | bc) -ne 1 ]]; then
        log_message "ERROR: Python 3.11+ is required (found $python_version)"
        return 1
    fi
    
    # Check for Alembic
    if ! python3 -c "import alembic" &> /dev/null; then
        log_message "ERROR: Alembic is not installed"
        return 1
    fi
    
    # Check for SQLite3
    if ! command -v sqlite3 &> /dev/null; then
        log_message "ERROR: SQLite3 is not installed"
        return 1
    fi
    
    log_message "All prerequisites are met"
    return 0
}

# Create a backup of the database
create_backup() {
    local db_path="$1"
    local backup_path="$2"
    
    # If backup path is not provided, create one with timestamp
    if [ -z "$backup_path" ]; then
        local timestamp=$(date '+%Y%m%d%H%M%S')
        backup_path="$BACKUP_DIR/personal_ai_${timestamp}.db"
    fi
    
    # Create backup directory if it doesn't exist
    mkdir -p "$(dirname "$backup_path")"
    
    log_message "Creating backup of database at $db_path to $backup_path"
    
    # Check if database file exists
    if [ ! -f "$db_path" ]; then
        log_message "ERROR: Database file $db_path does not exist"
        return 1
    fi
    
    # Create backup using SQLite3's .backup command for consistency
    sqlite3 "$db_path" ".backup '$backup_path'"
    
    # Verify backup was created successfully
    if [ ! -f "$backup_path" ]; then
        log_message "ERROR: Failed to create backup at $backup_path"
        return 1
    fi
    
    # Verify backup integrity
    if ! verify_database "$backup_path"; then
        log_message "ERROR: Backup integrity check failed"
        return 1
    fi
    
    log_message "Backup created successfully at $backup_path"
    echo "$backup_path"
    return 0
}

# Verify database integrity
verify_database() {
    local db_path="$1"
    
    log_message "Verifying database integrity for $db_path..."
    
    # Check if database file exists
    if [ ! -f "$db_path" ]; then
        log_message "ERROR: Database file $db_path does not exist"
        return 1
    fi
    
    # Run SQLite integrity_check
    local integrity_check=$(sqlite3 "$db_path" "PRAGMA integrity_check;")
    if [ "$integrity_check" != "ok" ]; then
        log_message "ERROR: Database integrity check failed: $integrity_check"
        return 1
    fi
    
    # Run SQLite foreign_key_check
    local foreign_key_check=$(sqlite3 "$db_path" "PRAGMA foreign_key_check;")
    if [ -n "$foreign_key_check" ]; then
        log_message "ERROR: Foreign key check failed: $foreign_key_check"
        return 1
    fi
    
    # Verify essential tables exist
    local tables=$(sqlite3 "$db_path" ".tables")
    local required_tables=("conversations" "messages" "memory_items" "documents" "user_settings")
    
    for table in "${required_tables[@]}"; do
        if ! echo "$tables" | grep -q "$table"; then
            log_message "WARNING: Required table '$table' not found in database"
        fi
    done
    
    log_message "Database integrity verification passed"
    return 0
}

# Run database migration to specified revision
run_migration() {
    local db_path="$1"
    local target_revision="$2"
    
    log_message "Starting database migration to revision $target_revision"
    
    # Create backup before migration
    local backup_path=$(create_backup "$db_path")
    if [ $? -ne 0 ]; then
        log_message "ERROR: Failed to create backup before migration"
        return 1
    fi
    
    # Verify database integrity before migration
    if ! verify_database "$db_path"; then
        log_message "ERROR: Database integrity check failed, aborting migration"
        return 1
    fi
    
    # Set database URL environment variable for Alembic
    export PYTHONPATH=$PROJECT_ROOT
    export DATABASE_URL="sqlite:///$db_path"
    
    # Run Alembic upgrade command
    local revision_arg="head"
    if [ -n "$target_revision" ]; then
        revision_arg="$target_revision"
    fi
    
    log_message "Running migration to $revision_arg..."
    
    # Execute Alembic upgrade
    cd "$MIGRATIONS_DIR"
    if ! python3 -m alembic upgrade "$revision_arg"; then
        log_message "ERROR: Migration failed"
        log_message "Restoring from backup $backup_path"
        cp "$backup_path" "$db_path"
        return 1
    fi
    
    # Verify database integrity after migration
    if ! verify_database "$db_path"; then
        log_message "ERROR: Database integrity check failed after migration"
        log_message "Restoring from backup $backup_path"
        cp "$backup_path" "$db_path"
        return 1
    fi
    
    # Run post-migration setup
    cd "$BACKEND_DIR"
    if ! python3 -m scripts.initialize_db --sqlite-path "$db_path"; then
        log_message "WARNING: Post-migration initialization failed"
    fi
    
    log_message "Migration to $revision_arg completed successfully"
    return 0
}

# Run database rollback to specified revision
run_rollback() {
    local db_path="$1"
    local target_revision="$2"
    
    # If no target revision specified, default to previous version
    if [ -z "$target_revision" ]; then
        target_revision="-1"
    fi
    
    log_message "Starting database rollback to revision $target_revision"
    
    # Create backup before rollback
    local backup_path=$(create_backup "$db_path")
    if [ $? -ne 0 ]; then
        log_message "ERROR: Failed to create backup before rollback"
        return 1
    fi
    
    # Verify database integrity before rollback
    if ! verify_database "$db_path"; then
        log_message "ERROR: Database integrity check failed, aborting rollback"
        return 1
    fi
    
    # Set database URL environment variable for Alembic
    export PYTHONPATH=$PROJECT_ROOT
    export DATABASE_URL="sqlite:///$db_path"
    
    log_message "Running rollback to $target_revision..."
    
    # Execute Alembic downgrade
    cd "$MIGRATIONS_DIR"
    if ! python3 -m alembic downgrade "$target_revision"; then
        log_message "ERROR: Rollback failed"
        log_message "Restoring from backup $backup_path"
        cp "$backup_path" "$db_path"
        return 1
    fi
    
    # Verify database integrity after rollback
    if ! verify_database "$db_path"; then
        log_message "ERROR: Database integrity check failed after rollback"
        log_message "Restoring from backup $backup_path"
        cp "$backup_path" "$db_path"
        return 1
    fi
    
    # Run post-rollback setup
    cd "$BACKEND_DIR"
    if ! python3 -m scripts.initialize_db --sqlite-path "$db_path"; then
        log_message "WARNING: Post-rollback initialization failed"
    fi
    
    log_message "Rollback to $target_revision completed successfully"
    return 0
}

# Check current migration status
check_migration_status() {
    local db_path="$1"
    
    log_message "Checking migration status for $db_path"
    
    # Check if database file exists
    if [ ! -f "$db_path" ]; then
        log_message "ERROR: Database file $db_path does not exist"
        return 1
    fi
    
    # Set database URL environment variable for Alembic
    export PYTHONPATH=$PROJECT_ROOT
    export DATABASE_URL="sqlite:///$db_path"
    
    # Run Alembic current command to show current revision
    cd "$MIGRATIONS_DIR"
    echo "Current revision:"
    python3 -m alembic current
    
    # Run Alembic history command to show available migrations
    echo -e "\nAvailable migration history:"
    python3 -m alembic history --verbose
    
    # Check for pending migrations
    local current_rev=$(python3 -m alembic current 2>/dev/null | awk '{print $1}')
    local latest_rev=$(python3 -m alembic history -r head:$current_rev 2>/dev/null | head -1 | awk '{print $2}')
    
    if [ "$current_rev" != "$latest_rev" ] && [ -n "$latest_rev" ]; then
        echo -e "\nPending migrations are available."
        echo "Run 'db_migration.sh migrate' to update to the latest version."
    else
        echo -e "\nDatabase is at the latest revision."
    fi
    
    return 0
}

# Restore database from backup
restore_from_backup() {
    local db_path="$1"
    local backup_path="$2"
    
    log_message "Restoring database from backup $backup_path to $db_path"
    
    # Check if backup file exists
    if [ ! -f "$backup_path" ]; then
        log_message "ERROR: Backup file $backup_path does not exist"
        return 1
    fi
    
    # Verify backup integrity
    if ! verify_database "$backup_path"; then
        log_message "ERROR: Backup integrity check failed, aborting restore"
        return 1
    fi
    
    # Create a backup of the current database (just in case)
    local current_backup=""
    if [ -f "$db_path" ]; then
        current_backup=$(create_backup "$db_path")
        if [ $? -ne 0 ]; then
            log_message "WARNING: Failed to create backup of current database"
        fi
    fi
    
    # Restore database from backup
    cp "$backup_path" "$db_path"
    
    # Verify restored database integrity
    if ! verify_database "$db_path"; then
        log_message "ERROR: Restored database integrity check failed"
        if [ -n "$current_backup" ] && [ -f "$current_backup" ]; then
            log_message "Reverting to original database state"
            cp "$current_backup" "$db_path"
        fi
        return 1
    fi
    
    log_message "Database restored successfully from $backup_path"
    return 0
}

# Parse command line arguments
parse_arguments() {
    if [ $# -eq 0 ]; then
        print_usage
        return 1
    fi
    
    # Default values
    COMMAND=""
    DB_PATH="$DEFAULT_DB_PATH"
    TARGET_REVISION=""
    BACKUP_PATH=""
    RESTORE_PATH=""
    
    # Parse command
    COMMAND="$1"
    shift
    
    case "$COMMAND" in
        migrate|rollback|status|backup|verify|restore)
            ;;
        --help|-h|help)
            print_usage
            return 1
            ;;
        *)
            echo "Unknown command: $COMMAND"
            print_usage
            return 1
            ;;
    esac
    
    # Parse options
    while [ $# -gt 0 ]; do
        case "$1" in
            --db)
                if [ -n "$2" ]; then
                    DB_PATH="$2"
                    shift 2
                else
                    echo "ERROR: --db requires a path argument"
                    return 1
                fi
                ;;
            --to)
                if [ -n "$2" ]; then
                    TARGET_REVISION="$2"
                    shift 2
                else
                    echo "ERROR: --to requires a revision argument"
                    return 1
                fi
                ;;
            --output)
                if [ -n "$2" ]; then
                    BACKUP_PATH="$2"
                    shift 2
                else
                    echo "ERROR: --output requires a path argument"
                    return 1
                fi
                ;;
            --from)
                if [ -n "$2" ]; then
                    RESTORE_PATH="$2"
                    shift 2
                else
                    echo "ERROR: --from requires a path argument"
                    return 1
                fi
                ;;
            --verbose)
                VERBOSE=1
                shift
                ;;
            *)
                echo "Unknown option: $1"
                print_usage
                return 1
                ;;
        esac
    done
    
    # Validate arguments based on command
    case "$COMMAND" in
        restore)
            if [ -z "$RESTORE_PATH" ]; then
                echo "ERROR: restore command requires --from argument"
                return 1
            fi
            ;;
    esac
    
    return 0
}

# Main function
main() {
    # Parse arguments
    parse_arguments "$@"
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    # Check prerequisites
    check_prerequisites
    if [ $? -ne 0 ]; then
        log_message "Prerequisites check failed, aborting."
        return 1
    fi
    
    # Execute command
    case "$COMMAND" in
        migrate)
            run_migration "$DB_PATH" "$TARGET_REVISION"
            ;;
        rollback)
            run_rollback "$DB_PATH" "$TARGET_REVISION"
            ;;
        status)
            check_migration_status "$DB_PATH"
            ;;
        backup)
            create_backup "$DB_PATH" "$BACKUP_PATH"
            ;;
        verify)
            verify_database "$DB_PATH"
            ;;
        restore)
            restore_from_backup "$DB_PATH" "$RESTORE_PATH"
            ;;
    esac
    
    return $?
}

# Call main function with all arguments
main "$@"
exit $?