# Deployment Guide

This document provides comprehensive deployment guidelines for the Personal AI Agent in production environments. While the application is designed as a local-first solution, this guide covers best practices for deploying the system in various scenarios, from single-user installations to self-hosted multi-user deployments.

## Deployment Models

The Personal AI Agent supports several deployment models to accommodate different user needs and infrastructure requirements.

### Local Desktop Application

The primary deployment model is as a desktop application running directly on the user's computer. This provides the highest level of privacy and data control.

- **Advantages**: Complete data privacy, no external dependencies, works offline
- **Disadvantages**: Limited by local hardware resources, no multi-device synchronization without additional setup
- **Recommended for**: Individual users with privacy concerns, offline usage scenarios

### Mobile Application

The mobile application provides a portable version of the Personal AI Agent for iOS and Android devices.

- **Advantages**: Portability, access on-the-go, touch-optimized interface
- **Disadvantages**: Limited by mobile hardware resources, reduced functionality compared to desktop
- **Recommended for**: Users who need access to their AI assistant while mobile

### Self-Hosted Server

For users who want to access their Personal AI Agent from multiple devices or share it with a small group, a self-hosted server deployment is available.

- **Advantages**: Accessible from multiple devices, centralized data storage, potential for more powerful hardware
- **Disadvantages**: Requires server setup and maintenance, potential privacy concerns if not properly secured
- **Recommended for**: Technical users, small teams, families sharing a home server

### Containerized Deployment

For advanced users and organizations, a containerized deployment using Docker provides flexibility and isolation.

- **Advantages**: Consistent environment, easy updates, resource isolation
- **Disadvantages**: Requires Docker knowledge, additional system overhead
- **Recommended for**: DevOps environments, server deployments, testing environments

## System Requirements

Before deploying the Personal AI Agent, ensure your system meets the following requirements:

### Desktop Application

**Minimum Requirements:**
- Operating System: Windows 10 64-bit, macOS 12+, Ubuntu 20.04 or equivalent
- Processor: Dual-core CPU, 2GHz+
- Memory: 4GB RAM
- Storage: 2GB free space
- Network: Intermittent connection for updates

**Recommended Requirements:**
- Operating System: Windows 11, macOS 13+, Ubuntu 22.04 or equivalent
- Processor: Quad-core CPU, 2.5GHz+
- Memory: 8GB RAM
- Storage: 10GB+ free space (SSD recommended)
- Network: Broadband connection

**For Local LLM Support:**
- Processor: 8+ cores, 3GHz+
- Memory: 16GB+ RAM (32GB+ recommended for larger models)
- Storage: 20GB+ free space (SSD required)
- GPU: CUDA-compatible GPU with 8GB+ VRAM (optional but recommended)

### Mobile Application

**Minimum Requirements:**
- iOS 14+ or Android 10+
- 3GB RAM
- 1GB free storage space
- Internet connection for cloud features

**Recommended Requirements:**
- iOS 16+ or Android 12+
- 4GB+ RAM
- 2GB+ free storage space
- Wi-Fi or strong mobile data connection

### Self-Hosted Server

**Minimum Requirements:**
- Operating System: Ubuntu 20.04 LTS or equivalent
- Processor: Quad-core CPU, 2.5GHz+
- Memory: 8GB RAM
- Storage: 10GB free space (SSD recommended)
- Network: Static IP or dynamic DNS, open ports for access

**Recommended Requirements:**
- Operating System: Ubuntu 22.04 LTS or equivalent
- Processor: 8+ cores, 3GHz+
- Memory: 16GB+ RAM
- Storage: 50GB+ free space (SSD required)
- Network: Static IP, broadband connection with good upload speed

### Containerized Deployment

**Minimum Requirements:**
- Docker Engine 24.0.0+
- Docker Compose 3.8+
- 8GB RAM
- 10GB free space
- Network connectivity between containers

**Recommended Requirements:**
- Docker Engine 24.0.0+
- Docker Compose 3.8+
- 16GB+ RAM
- 50GB+ free space (SSD required)
- Dedicated network for container communication

## Production Deployment

This section covers the steps for deploying the Personal AI Agent in a production environment.

### Containerized Deployment with Docker Compose

The recommended approach for production server deployment is using Docker Compose, which provides a consistent and isolated environment.

##### 1. Prepare the Environment

```bash
# Clone the repository
git clone https://github.com/yourusername/personal-ai-agent.git
cd personal-ai-agent

# Create necessary directories
mkdir -p data/vector_db data/sqlite data/logs data/config
```

##### 2. Configure the Environment

Create a `.env` file in the root directory with the following variables:

```
# Application Settings
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=INFO
ENABLE_ENCRYPTION=true
DEVELOPMENT_MODE=false

# Data Paths
VECTOR_DB_PATH=/app/data/vector_db
SQLITE_DB_PATH=/app/data/sqlite/personal_ai.db
CONFIG_DIR=/app/config
DATA_DIR=/app/data
LOG_DIR=/app/logs

# API Keys (Optional)
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
SERPAPI_API_KEY=your_serpapi_key_here

# LLM Settings
USE_LOCAL_LLM=false
LOCAL_MODEL_PATH=/app/models/llama3-8b.gguf
OPENAI_DEFAULT_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Frontend Settings
NEXT_PUBLIC_API_BASE_URL=http://localhost/api
NEXT_PUBLIC_ENABLE_CLOUD_FEATURES=false
NEXT_PUBLIC_DEV_MODE=false
NEXT_PUBLIC_ENABLE_ANALYTICS=false
```

Adjust these settings according to your environment and requirements.

##### 3. Configure Nginx

Create an Nginx configuration file at `infrastructure/docker/nginx/conf.d/default.conf`:

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://backend:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://backend:8000/health;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

For HTTPS support, create an SSL directory and add your certificates:

```bash
mkdir -p infrastructure/docker/nginx/ssl
# Copy your SSL certificates to this directory
```

Then update the Nginx configuration to use HTTPS.

##### 4. Start the Services

```bash
cd infrastructure/docker
docker-compose -f docker-compose.prod.yml up -d
```

This will start the following services:
- Backend API server
- Frontend web application
- ChromaDB vector database
- Nginx web server

You can access the application at http://localhost (or https://localhost if SSL is configured).

##### 5. Verify the Deployment

Check that all services are running correctly:

```bash
docker-compose -f docker-compose.prod.yml ps
```

Verify the application is accessible by navigating to http://localhost in your browser.

Check the logs for any errors:

```bash
docker-compose -f docker-compose.prod.yml logs
```

### Desktop Application Deployment

For deploying the desktop application to end users:

##### 1. Build the Application

```bash
# Ensure you have the necessary build tools installed
cd src/web

# Install dependencies
pnpm install

# Build the Electron application
pnpm run electron:build
```

This will generate platform-specific installers in the `src/web/out` directory.

##### 2. Distribute the Installers

The built installers can be distributed to users through various channels:

- Direct download from your website
- App stores (Microsoft Store, Mac App Store)
- Enterprise deployment tools
- Software distribution platforms

Ensure you provide clear installation instructions for each platform.

##### 3. User Installation

Users can install the application by running the appropriate installer for their platform:

- Windows: Run the `.exe` installer and follow the prompts
- macOS: Mount the `.dmg` file, drag the application to the Applications folder
- Linux: Install the `.deb`, `.rpm`, or run the `.AppImage` file

The application will automatically configure itself on first run and prompt the user for any required settings.

### Mobile Application Deployment

For deploying the mobile application to end users:

##### 1. Build the Application

For Android:
```bash
cd src/web/react-native
pnpm install
cd android
./gradlew assembleRelease
```

For iOS (requires macOS):
```bash
cd src/web/react-native
pnpm install
cd ios
pod install
xcodebuild -workspace PersonalAIAgent.xcworkspace -scheme PersonalAIAgent -configuration Release
```

##### 2. Distribute the Applications

The built applications can be distributed through:

- Google Play Store (Android)
- Apple App Store (iOS)
- Enterprise distribution methods
- Direct APK distribution (Android only)

Ensure you follow the respective app store guidelines for submission and approval.

##### 3. User Installation

Users can install the application from the respective app stores or through enterprise distribution methods.

For direct APK installation on Android, users need to enable installation from unknown sources in their device settings.

## Security Considerations

Security is a critical aspect of deploying the Personal AI Agent, especially when using the self-hosted server model.

### Data Encryption

The Personal AI Agent implements several layers of encryption to protect user data:

1. **Data at Rest**: All local data is encrypted using AES-256-GCM
2. **Data in Transit**: All communication uses TLS 1.3 with strong cipher suites
3. **API Keys**: Stored in secure, encrypted storage
4. **Backups**: End-to-end encrypted with user-controlled keys

To enable encryption, ensure the `ENABLE_ENCRYPTION` environment variable is set to `true` in your configuration.

### Network Security

For server deployments, implement the following network security measures:

1. **Firewall Configuration**: Restrict access to only necessary ports (typically 80/443)
2. **HTTPS**: Always use HTTPS with valid SSL certificates
3. **Rate Limiting**: Configure Nginx with rate limiting to prevent abuse
4. **IP Restrictions**: Consider restricting access to known IP addresses if possible
5. **Web Application Firewall**: Consider implementing a WAF for additional protection

Example Nginx rate limiting configuration:
```nginx
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=5r/s;
    
    server {
        location /api/ {
            limit_req zone=api burst=10 nodelay;
            proxy_pass http://backend:8000/;
        }
    }
}
```

### Authentication

For multi-user or server deployments, implement appropriate authentication:

1. **Device Authentication**: Leverage native OS security for desktop applications
2. **Application Authentication**: Implement PIN, password, or biometric authentication
3. **Server Authentication**: For self-hosted servers, implement user accounts with strong password policies

The Personal AI Agent supports various authentication methods that can be configured in the settings.

### API Key Management

Protect external service API keys:

1. **Secure Storage**: Store API keys in encrypted storage
2. **Minimal Scope**: Use the principle of least privilege for API keys
3. **Regular Rotation**: Implement a key rotation policy
4. **Environment Variables**: Use environment variables rather than hardcoding keys

Never commit API keys to version control or include them in container images.

### Regular Updates

Keep all components of the system updated:

1. **Application Updates**: Regularly update the Personal AI Agent to the latest version
2. **Container Images**: Keep base images and dependencies updated
3. **Operating System**: Apply security patches to the host operating system
4. **Dependencies**: Regularly audit and update dependencies

Implement a systematic approach to tracking and applying updates.

## Backup and Recovery

Implementing a robust backup and recovery strategy is essential for protecting user data.

### Backup Strategy

The Personal AI Agent provides built-in backup functionality:

1. **Local Backups**: Automated local backups on a configurable schedule
2. **Cloud Backups**: Optional encrypted cloud backups if enabled
3. **Manual Backups**: User-initiated backups for important milestones

To create a backup using the provided script:

```bash
./infrastructure/scripts/backup.sh create --name "weekly-backup" --include-databases --include-files --include-settings
```

To schedule regular backups, use cron (Linux/macOS) or Task Scheduler (Windows):

```bash
# Example cron entry for weekly backups (Linux/macOS)
0 2 * * 0 /path/to/personal-ai-agent/infrastructure/scripts/backup.sh create --name "weekly-backup" --include-databases --include-files --include-settings
```

### Backup Verification

Regularly verify the integrity of your backups:

```bash
./infrastructure/scripts/backup.sh verify --backup-path /path/to/backup/file.zip
```

Implement a policy to verify backups on a regular schedule, such as monthly verification of all backup files.

### Recovery Procedures

In case of data loss or corruption, restore from a backup:

```bash
./infrastructure/scripts/restore.sh restore --backup-path /path/to/backup/file.zip --include-databases --include-files --include-settings
```

For containerized deployments, you may need to stop the containers before restoring:

```bash
cd infrastructure/docker
docker-compose -f docker-compose.prod.yml down

# Restore the backup
../scripts/restore.sh restore --backup-path /path/to/backup/file.zip

# Restart the containers
docker-compose -f docker-compose.prod.yml up -d
```

### Disaster Recovery Plan

Develop a comprehensive disaster recovery plan that includes:

1. **Regular Backups**: Automated daily or weekly backups
2. **Off-site Storage**: Store backups in multiple locations
3. **Recovery Testing**: Regularly test the recovery process
4. **Documentation**: Maintain detailed recovery procedures
5. **RTO/RPO Definitions**: Define acceptable Recovery Time Objective and Recovery Point Objective

For critical deployments, consider implementing a hot standby system that can take over in case of primary system failure.

## Maintenance Procedures

Regular maintenance is essential for keeping the Personal AI Agent running smoothly.

### Database Maintenance

Perform regular database maintenance to ensure optimal performance:

```bash
# Optimize SQLite database
./infrastructure/scripts/db_migration.sh optimize --db-path /path/to/data

# Check database integrity
./infrastructure/scripts/db_migration.sh verify --db-path /path/to/data
```

For containerized deployments, you can run these commands inside the container:

```bash
docker exec -it personal-ai-agent-backend /app/infrastructure/scripts/db_migration.sh optimize --db-path /app/data
```

Schedule regular database maintenance tasks, such as weekly optimization and monthly integrity checks.

### Application Updates

Keep the application updated to the latest version:

1. **Desktop/Mobile**: The application can update itself automatically or prompt users for updates
2. **Self-Hosted Server**: Update by pulling the latest code and rebuilding
3. **Containerized Deployment**: Update by pulling the latest images and restarting containers

For containerized deployments:

```bash
cd infrastructure/docker

# Pull the latest images
docker-compose -f docker-compose.prod.yml pull

# Restart the services with the new images
docker-compose -f docker-compose.prod.yml up -d
```

Implement a testing process for updates before applying them to production environments.

### Log Management

Implement proper log management to facilitate troubleshooting and monitoring:

1. **Log Rotation**: Configure log rotation to prevent disk space issues
2. **Log Levels**: Adjust log levels based on environment (INFO for production, DEBUG for troubleshooting)
3. **Log Analysis**: Regularly review logs for errors and anomalies

Example log rotation configuration for Linux (logrotate):

```
/path/to/personal-ai-agent/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 user group
}
```

### Performance Monitoring

Monitor system performance to identify and address issues proactively:

1. **Resource Usage**: Monitor CPU, memory, disk, and network usage
2. **Response Times**: Track API response times and user interface responsiveness
3. **Error Rates**: Monitor application errors and exceptions
4. **Database Performance**: Track query performance and database size

For containerized deployments, consider implementing monitoring with tools like Prometheus and Grafana:

```bash
# Example docker-compose addition for monitoring
services:
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./infrastructure/monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana-data:/var/lib/grafana
      - ./infrastructure/monitoring/grafana-dashboard.json:/etc/grafana/provisioning/dashboards/personal-ai-agent.json
    ports:
      - "3001:3000"
    depends_on:
      - prometheus
```

### Scheduled Maintenance

Implement a regular maintenance schedule:

| Task | Frequency | Description |
|------|-----------|-------------|
| Database Optimization | Weekly | Optimize SQLite and vector databases |
| Database Integrity Check | Monthly | Verify database integrity |
| Backup Verification | Monthly | Test backup integrity and restore process |
| Log Rotation | Daily | Rotate and compress logs |
| Update Check | Weekly | Check for application updates |
| Security Audit | Quarterly | Review security settings and access |

Document maintenance procedures and create a calendar of scheduled maintenance activities.

### Scaling Considerations

While the Personal AI Agent is primarily designed as a local-first application, there are considerations for scaling in multi-user or high-load environments.

#### Vertical Scaling

Improve performance by upgrading the hardware resources of the host system:

1. **CPU**: More cores for parallel processing
2. **Memory**: Increased RAM for larger vector databases and context windows
3. **Storage**: Faster SSDs for improved database performance
4. **GPU**: Add or upgrade GPU for local LLM acceleration

Adjust container resource limits in docker-compose.prod.yml to take advantage of additional resources:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '4'  # Increased from 2
          memory: 4G  # Increased from 2G
        reservations:
          cpus: '1'  # Increased from 0.5
          memory: 1G  # Increased from 512M
```

#### Horizontal Scaling

For multi-user deployments, consider horizontal scaling options:

1. **Load Balancing**: Implement Nginx as a load balancer for multiple backend instances
2. **Database Sharding**: Separate databases for different user groups
3. **Service Replication**: Run multiple instances of stateless services

Example Nginx load balancing configuration:

```nginx
upstream backend_servers {
    server backend1:8000;
    server backend2:8000;
    server backend3:8000;
}

server {
    listen 80;
    
    location /api/ {
        proxy_pass http://backend_servers/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Note that the Personal AI Agent's local-first design means true horizontal scaling requires careful consideration of data synchronization between instances.

#### Performance Optimization

Optimize performance for larger deployments:

1. **Database Indexing**: Ensure proper indexes on frequently queried fields
2. **Caching**: Implement caching for frequent queries and responses
3. **Connection Pooling**: Configure appropriate connection pool sizes
4. **Batch Processing**: Use batch operations for bulk data processing

Example ChromaDB optimization settings in config.yaml:

```yaml
chroma_db:
  persist_directory: /app/data/vector_db
  anonymized_telemetry: false
  allow_reset: false
  is_persistent: true
  optimizers:
    hnsw_ef_construction: 128  # Increased from default
    hnsw_m: 16  # Increased from default
  cache:
    enabled: true
    size_mb: 1024  # Increased cache size
```

#### Multi-User Considerations

For deployments serving multiple users:

1. **User Isolation**: Ensure data separation between users
2. **Resource Allocation**: Implement fair resource sharing
3. **Authentication**: Add robust user authentication and authorization
4. **Monitoring**: Track per-user resource usage and performance

The Personal AI Agent is primarily designed for single-user use, so multi-user deployments require additional configuration and potentially custom development for proper user isolation.

### Troubleshooting

Common issues and their solutions for production deployments.

#### Container Issues

**Issue**: Containers fail to start
**Solution**: Check Docker logs with `docker-compose -f docker-compose.prod.yml logs`

**Issue**: Container resource constraints
**Solution**: Adjust resource limits in docker-compose.prod.yml

**Issue**: Container networking problems
**Solution**: Verify network configuration and DNS resolution between containers

#### Database Issues

**Issue**: Database corruption
**Solution**: Restore from backup or run repair tools:
```bash
./infrastructure/scripts/db_migration.sh verify --db-path /path/to/data
```

**Issue**: Slow database performance
**Solution**: Optimize the database and check for resource constraints:
```bash
./infrastructure/scripts/db_migration.sh optimize --db-path /path/to/data
```

**Issue**: Database migration failures
**Solution**: Check migration logs and restore from backup if necessary

#### API Issues

**Issue**: API timeouts
**Solution**: Check backend logs, increase timeout settings in Nginx

**Issue**: API rate limiting
**Solution**: Adjust rate limiting settings in Nginx

**Issue**: API authentication failures
**Solution**: Verify API keys and authentication configuration

#### Performance Issues

**Issue**: High CPU usage
**Solution**: Profile the application, optimize resource-intensive operations

**Issue**: Memory leaks
**Solution**: Monitor memory usage patterns, restart services if necessary

**Issue**: Slow response times
**Solution**: Optimize database queries, implement caching, check network latency

#### Diagnostic Tools

Useful diagnostic commands for troubleshooting:

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# View container logs
docker-compose -f docker-compose.prod.yml logs [service_name]

# Check container resource usage
docker stats

# Inspect container networking
docker network inspect personal-ai-agent-network

# Check database integrity
./infrastructure/scripts/db_migration.sh verify --db-path /path/to/data

# Test API endpoints
curl -v http://localhost/api/health

# Monitor system resources
top -c
htop
iotop
```

### Deployment Checklist

Use this checklist to ensure a successful deployment of the Personal AI Agent.

#### Pre-Deployment

- [ ] Verify system meets all hardware and software requirements
- [ ] Ensure all required API keys are available (if using external services)
- [ ] Prepare backup and recovery procedures
- [ ] Test the application in a staging environment
- [ ] Review security settings and configurations
- [ ] Prepare monitoring and logging infrastructure
- [ ] Document deployment procedures and configurations

#### Deployment

- [ ] Configure environment variables and settings
- [ ] Set up data directories with appropriate permissions
- [ ] Configure web server (Nginx) with proper security settings
- [ ] Deploy containers or application packages
- [ ] Initialize databases and run migrations
- [ ] Configure backup schedules
- [ ] Set up monitoring and alerting
- [ ] Implement log rotation

#### Post-Deployment

- [ ] Verify all services are running correctly
- [ ] Test application functionality
- [ ] Verify security configurations (HTTPS, firewalls, etc.)
- [ ] Create initial backup
- [ ] Test backup and restore procedures
- [ ] Monitor performance and resource usage
- [ ] Document the deployed environment
- [ ] Provide user documentation and training if necessary

#### Ongoing Maintenance

- [ ] Implement regular backup schedule
- [ ] Set up database maintenance tasks
- [ ] Configure automatic updates (if appropriate)
- [ ] Establish monitoring and alerting thresholds
- [ ] Create a maintenance schedule
- [ ] Document troubleshooting procedures
- [ ] Prepare for disaster recovery scenarios

## References

Additional resources for deploying and maintaining the Personal AI Agent.

### Internal Documentation

- [Setup Guide](SETUP.md) - Basic setup instructions
- [Architecture Documentation](ARCHITECTURE.md) - System architecture details
- [API Documentation](API.md) - API endpoint reference
- [Security Documentation](SECURITY.md) - Security features and best practices

### External Resources

- [Docker Documentation](https://docs.docker.com/) - Official Docker documentation
- [Nginx Documentation](https://nginx.org/en/docs/) - Official Nginx documentation
- [ChromaDB Documentation](https://docs.trychroma.com/) - Vector database documentation
- [FastAPI Documentation](https://fastapi.tiangolo.com/) - Backend framework documentation
- [Next.js Documentation](https://nextjs.org/docs) - Frontend framework documentation

### Scripts and Tools

- `infrastructure/scripts/setup_local_environment.sh` - Environment setup script
- `infrastructure/scripts/backup.sh` - Backup creation and management
- `infrastructure/scripts/restore.sh` - Backup restoration
- `infrastructure/scripts/db_migration.sh` - Database migration and maintenance
- `infrastructure/docker/docker-compose.prod.yml` - Production Docker Compose configuration