# Local variables for storage class mapping across providers
locals {
  aws_storage_class = var.storage_class == "standard" ? "STANDARD" : var.storage_class == "infrequent_access" ? "STANDARD_IA" : "GLACIER"
  gcp_storage_class = var.storage_class == "standard" ? "STANDARD" : var.storage_class == "infrequent_access" ? "NEARLINE" : "ARCHIVE"
  azure_storage_tier = var.storage_class == "standard" ? "Hot" : var.storage_class == "infrequent_access" ? "Cool" : "Archive"
  bucket_name = "${var.resource_prefix}-storage-${var.random_suffix}"
}

# AWS S3 Bucket (created only when AWS is selected)
resource "aws_s3_bucket" "backup" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  bucket = local.bucket_name
  tags   = var.tags
}

# AWS S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "backup" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  bucket = aws_s3_bucket.backup[0].id
  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Suspended"
  }
}

# AWS S3 Bucket Lifecycle Configuration
resource "aws_s3_bucket_lifecycle_configuration" "backup" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  bucket = aws_s3_bucket.backup[0].id

  # Rule for transitioning to Infrequent Access storage class
  dynamic "rule" {
    for_each = var.lifecycle_rules[var.storage_class].days_to_transition_to_infrequent_access > 0 ? [1] : []
    content {
      id     = "transition-to-ia"
      status = "Enabled"
      
      filter {
        prefix = ""
      }
      
      transition {
        days          = var.lifecycle_rules[var.storage_class].days_to_transition_to_infrequent_access
        storage_class = "STANDARD_IA"
      }
    }
  }
  
  # Rule for transitioning to Glacier storage class
  dynamic "rule" {
    for_each = var.lifecycle_rules[var.storage_class].days_to_transition_to_archive > 0 ? [1] : []
    content {
      id     = "transition-to-glacier"
      status = "Enabled"
      
      filter {
        prefix = ""
      }
      
      transition {
        days          = var.lifecycle_rules[var.storage_class].days_to_transition_to_archive
        storage_class = "GLACIER"
      }
    }
  }
  
  # Rule for object expiration
  rule {
    id     = "expiration"
    status = "Enabled"
    
    filter {
      prefix = ""
    }
    
    expiration {
      days = var.lifecycle_rules[var.storage_class].days_to_expiration
    }
  }
}

# AWS S3 Bucket CORS Configuration
resource "aws_s3_bucket_cors_configuration" "backup" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  bucket = aws_s3_bucket.backup[0].id
  
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = var.cors_allowed_origins
    expose_headers  = ["ETag"]
    max_age_seconds = 3600
  }
}

# AWS S3 Bucket Server Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "backup" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  bucket = aws_s3_bucket.backup[0].id
  
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Google Cloud Storage Bucket (created only when GCP is selected)
resource "google_storage_bucket" "backup" {
  count = var.cloud_provider == "gcp" ? 1 : 0
  
  name          = local.bucket_name
  location      = var.region
  storage_class = local.gcp_storage_class
  
  versioning {
    enabled = var.versioning_enabled
  }
  
  # Lifecycle rules for storage classes and expiration
  dynamic "lifecycle_rule" {
    for_each = var.lifecycle_rules[var.storage_class].days_to_transition_to_infrequent_access > 0 ? [1] : []
    content {
      condition {
        age        = var.lifecycle_rules[var.storage_class].days_to_transition_to_infrequent_access
        with_state = "LIVE"
      }
      action {
        type          = "SetStorageClass"
        storage_class = "NEARLINE"
      }
    }
  }
  
  dynamic "lifecycle_rule" {
    for_each = var.lifecycle_rules[var.storage_class].days_to_transition_to_archive > 0 ? [1] : []
    content {
      condition {
        age        = var.lifecycle_rules[var.storage_class].days_to_transition_to_archive
        with_state = "LIVE"
      }
      action {
        type          = "SetStorageClass"
        storage_class = "ARCHIVE"
      }
    }
  }
  
  lifecycle_rule {
    condition {
      age        = var.lifecycle_rules[var.storage_class].days_to_expiration
      with_state = "LIVE"
    }
    action {
      type = "Delete"
    }
  }
  
  # CORS configuration
  cors {
    origin          = var.cors_allowed_origins
    method          = ["GET", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
  
  # Encryption (note: client-side encryption is managed by the application)
  encryption {
    default_kms_key_name = null
  }
  
  # Tags (labels in GCP)
  labels = var.tags
}

# Azure Resource Group (created only when Azure is selected)
resource "azurerm_resource_group" "storage" {
  count = var.cloud_provider == "azure" ? 1 : 0
  
  name     = "${var.resource_prefix}-rg"
  location = var.region
  tags     = var.tags
}

# Azure Storage Account
resource "azurerm_storage_account" "storage" {
  count = var.cloud_provider == "azure" ? 1 : 0
  
  name                     = replace(local.bucket_name, "-", "")
  resource_group_name      = azurerm_resource_group.storage[0].name
  location                 = azurerm_resource_group.storage[0].location
  account_tier             = var.storage_class == "archive" ? "Standard" : "Standard"
  account_replication_type = "LRS"
  access_tier              = local.azure_storage_tier
  
  # Security settings
  enable_https_traffic_only = true
  min_tls_version           = "TLS1_2"
  
  # Blob properties for versioning and CORS
  blob_properties {
    versioning_enabled = var.versioning_enabled
    
    cors_rule {
      allowed_headers    = ["*"]
      allowed_methods    = ["GET", "PUT", "POST", "DELETE"]
      allowed_origins    = var.cors_allowed_origins
      exposed_headers    = ["ETag"]
      max_age_seconds    = 3600
    }
  }
  
  tags = var.tags
}

# Azure Storage Container for backups
resource "azurerm_storage_container" "backups" {
  count = var.cloud_provider == "azure" ? 1 : 0
  
  name                  = "backups"
  storage_account_name  = azurerm_storage_account.storage[0].name
  container_access_type = "private"
}

# Azure Storage Management Policy for lifecycle rules
resource "azurerm_storage_management_policy" "lifecycle" {
  count = var.cloud_provider == "azure" ? 1 : 0
  
  storage_account_id = azurerm_storage_account.storage[0].id
  
  rule {
    name    = "lifecycle"
    enabled = true
    
    filters {
      prefix_match = ["backups/"]
      blob_types   = ["blockBlob"]
    }
    
    actions {
      base_blob {
        tier_to_cool_after_days_since_modification_greater_than = var.lifecycle_rules[var.storage_class].days_to_transition_to_infrequent_access > 0 ? var.lifecycle_rules[var.storage_class].days_to_transition_to_infrequent_access : null
        tier_to_archive_after_days_since_modification_greater_than = var.lifecycle_rules[var.storage_class].days_to_transition_to_archive > 0 ? var.lifecycle_rules[var.storage_class].days_to_transition_to_archive : null
        delete_after_days_since_modification_greater_than = var.lifecycle_rules[var.storage_class].days_to_expiration
      }
    }
  }
}

# Variables
variable "cloud_provider" {
  description = "The cloud provider to use (aws, gcp, azure)"
  type        = string
  
  validation {
    condition     = contains(["aws", "gcp", "azure"], var.cloud_provider)
    error_message = "Cloud provider must be one of: aws, gcp, azure."
  }
}

variable "resource_prefix" {
  description = "Prefix to use for resource naming"
  type        = string
}

variable "random_suffix" {
  description = "Random string to ensure globally unique resource names"
  type        = string
}

variable "region" {
  description = "Region to deploy storage resources in"
  type        = string
}

variable "storage_class" {
  description = "Storage class/tier to use (standard, infrequent_access, archive)"
  type        = string
  default     = "infrequent_access"
  
  validation {
    condition     = contains(["standard", "infrequent_access", "archive"], var.storage_class)
    error_message = "Storage class must be one of: standard, infrequent_access, archive."
  }
}

variable "versioning_enabled" {
  description = "Whether to enable versioning for backup storage"
  type        = bool
  default     = true
}

variable "lifecycle_rules" {
  description = "Lifecycle rules for managing backup storage"
  type = map(object({
    days_to_transition_to_infrequent_access = number
    days_to_transition_to_archive           = number
    days_to_expiration                      = number
  }))
}

variable "cors_allowed_origins" {
  description = "List of origins allowed to access storage via CORS"
  type        = list(string)
  default     = ["*"]
}

variable "tags" {
  description = "Tags to apply to storage resources"
  type        = map(string)
  default     = {}
}

# Outputs
output "storage_bucket_name" {
  description = "Name of the storage bucket/container created for encrypted backups"
  value = var.cloud_provider == "aws" ? aws_s3_bucket.backup[0].id : var.cloud_provider == "gcp" ? google_storage_bucket.backup[0].name : "${azurerm_storage_account.storage[0].name}/backups"
}

output "storage_bucket_url" {
  description = "URL for accessing the storage bucket/container"
  value = var.cloud_provider == "aws" ? "https://${aws_s3_bucket.backup[0].bucket_regional_domain_name}" : var.cloud_provider == "gcp" ? "https://storage.googleapis.com/${google_storage_bucket.backup[0].name}" : "https://${azurerm_storage_account.storage[0].name}.blob.core.windows.net/backups"
}