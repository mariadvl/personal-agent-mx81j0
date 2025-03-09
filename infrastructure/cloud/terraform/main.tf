# Terraform configuration for Personal AI Agent cloud infrastructure
# Supports AWS, Google Cloud Platform, and Azure

terraform {
  required_version = ">=1.0.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "~> 4.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
  
  backend "local" {
    path = "terraform.tfstate"
  }
}

# Local variables for naming and tagging consistency
locals {
  resource_prefix = "personal-ai-agent-${var.environment}"
  common_tags = {
    Project     = "Personal AI Agent"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

# Provider configurations
provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
  # Only used when AWS is selected as the cloud provider
}

provider "google" {
  project     = var.gcp_project
  region      = var.gcp_region
  credentials = file(var.gcp_credentials_file)
  # Only used when GCP is selected as the cloud provider
}

provider "azurerm" {
  features {}
  subscription_id = var.azure_subscription_id
  tenant_id       = var.azure_tenant_id
  # Only used when Azure is selected as the cloud provider
}

# Random string for unique resource naming
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# Storage module for cloud backup
module "storage" {
  source = "./modules/storage"
  
  cloud_provider     = var.cloud_provider
  resource_prefix    = local.resource_prefix
  random_suffix      = random_string.suffix.result
  region             = var.cloud_provider == "aws" ? var.aws_region : var.cloud_provider == "gcp" ? var.gcp_region : var.azure_region
  storage_class      = var.storage_class
  versioning_enabled = var.enable_versioning
  lifecycle_rules    = var.storage_lifecycle_rules
  cors_allowed_origins = var.cors_allowed_origins
  tags               = local.common_tags
}

# API Gateway module for cloud service access
module "api" {
  source = "./modules/api"
  
  cloud_provider     = var.cloud_provider
  resource_prefix    = local.resource_prefix
  random_suffix      = random_string.suffix.result
  region             = var.cloud_provider == "aws" ? var.aws_region : var.cloud_provider == "gcp" ? var.gcp_region : var.azure_region
  environment        = var.environment
  cors_allowed_origins = var.cors_allowed_origins
  rate_limiting_enabled = var.enable_rate_limiting
  rate_limit_requests = var.rate_limit_requests
  tags               = local.common_tags
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

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "prod"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# AWS specific variables
variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-west-2"
}

variable "aws_profile" {
  description = "AWS CLI profile to use for authentication"
  type        = string
  default     = "default"
}

# GCP specific variables
variable "gcp_project" {
  description = "Google Cloud project ID"
  type        = string
  default     = ""
}

variable "gcp_region" {
  description = "Google Cloud region for resources"
  type        = string
  default     = "us-central1"
}

variable "gcp_credentials_file" {
  description = "Path to Google Cloud credentials file"
  type        = string
  default     = ""
}

# Azure specific variables
variable "azure_region" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"
}

variable "azure_subscription_id" {
  description = "Azure subscription ID"
  type        = string
  default     = ""
}

variable "azure_tenant_id" {
  description = "Azure tenant ID"
  type        = string
  default     = ""
}

# Storage configuration variables
variable "storage_class" {
  description = "Storage class to use (standard, infrequent_access, archive)"
  type        = string
  default     = "infrequent_access"
  
  validation {
    condition     = contains(["standard", "infrequent_access", "archive"], var.storage_class)
    error_message = "Storage class must be one of: standard, infrequent_access, archive."
  }
}

variable "enable_versioning" {
  description = "Whether to enable versioning for backup storage"
  type        = bool
  default     = true
}

variable "storage_lifecycle_rules" {
  description = "Lifecycle rules for managing backup storage"
  type = map(object({
    days_to_transition_to_infrequent_access = number
    days_to_transition_to_archive           = number
    days_to_expiration                      = number
  }))
  
  default = {
    standard = {
      days_to_transition_to_infrequent_access = 30
      days_to_transition_to_archive           = 90
      days_to_expiration                      = 365
    }
    infrequent_access = {
      days_to_transition_to_infrequent_access = 0
      days_to_transition_to_archive           = 90
      days_to_expiration                      = 365
    }
    archive = {
      days_to_transition_to_infrequent_access = 0
      days_to_transition_to_archive           = 0
      days_to_expiration                      = 730
    }
  }
}

# API configuration variables
variable "cors_allowed_origins" {
  description = "List of origins allowed to access cloud resources via CORS"
  type        = list(string)
  default     = ["*"]
}

variable "enable_rate_limiting" {
  description = "Whether to enable rate limiting for API endpoints"
  type        = bool
  default     = true
}

variable "rate_limit_requests" {
  description = "Number of requests allowed per minute when rate limiting is enabled"
  type        = number
  default     = 60
}

# Outputs
output "cloud_provider" {
  description = "The cloud provider being used"
  value       = var.cloud_provider
}

output "storage_bucket_name" {
  description = "Name of the storage bucket/container created for encrypted backups"
  value       = module.storage.storage_bucket_name
}

output "storage_bucket_url" {
  description = "URL for accessing the storage bucket/container"
  value       = module.storage.storage_bucket_url
}

output "api_endpoint" {
  description = "The endpoint URL for the API gateway"
  value       = module.api.api_endpoint
}

output "api_key" {
  description = "API key for authenticating with cloud services"
  value       = module.api.api_key
  sensitive   = true
}