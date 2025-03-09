# variables.tf
#
# This file defines the variables used to configure cloud resources for the
# Personal AI Agent's optional cloud features. It supports multiple cloud providers
# (AWS, GCP, Azure) with appropriate configuration options for encrypted backup storage
# and other cloud services.

# Cloud provider selection
variable "cloud_provider" {
  description = "The cloud provider to use (aws, gcp, azure)"
  type        = string
  default     = "aws"
  
  validation {
    condition     = contains(["aws", "gcp", "azure"], var.cloud_provider)
    error_message = "Cloud provider must be one of: aws, gcp, azure."
  }
}

# Environment settings
variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# AWS specific settings
variable "aws_region" {
  description = "AWS region to deploy resources in"
  type        = string
  default     = "us-west-2"
}

variable "aws_profile" {
  description = "AWS profile to use for authentication"
  type        = string
  default     = "default"
}

# GCP specific settings
variable "gcp_project" {
  description = "Google Cloud project ID"
  type        = string
  default     = ""
}

variable "gcp_region" {
  description = "Google Cloud region to deploy resources in"
  type        = string
  default     = "us-central1"
}

variable "gcp_credentials_file" {
  description = "Path to Google Cloud credentials file"
  type        = string
  default     = "credentials.json"
}

# Azure specific settings
variable "azure_region" {
  description = "Azure region to deploy resources in"
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

# Storage settings
variable "storage_class" {
  description = "Storage class/tier to use (standard, infrequent_access, archive)"
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
    days_to_transition_to_archive = number
    days_to_expiration = number
  }))
  
  default = {
    standard = {
      days_to_transition_to_infrequent_access = 30
      days_to_transition_to_archive = 90
      days_to_expiration = 365
    }
    infrequent_access = {
      days_to_transition_to_infrequent_access = 0
      days_to_transition_to_archive = 90
      days_to_expiration = 365
    }
    archive = {
      days_to_transition_to_infrequent_access = 0
      days_to_transition_to_archive = 0
      days_to_expiration = 730
    }
  }
}

# Access control settings
variable "cors_allowed_origins" {
  description = "List of origins allowed to access cloud resources via CORS"
  type        = list(string)
  default     = ["*"]
}

# Rate limiting settings
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