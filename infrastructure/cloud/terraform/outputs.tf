# Terraform outputs for Personal AI Agent cloud infrastructure
# These outputs expose essential information needed by the application
# to interact with cloud resources for optional backup functionality

output "cloud_provider" {
  description = "The cloud provider selected for deployment (aws, gcp, azure)"
  value       = var.cloud_provider
  sensitive   = false
}

output "storage_bucket_name" {
  description = "Name of the storage bucket/container created for encrypted backups"
  value       = module.storage.storage_bucket_name
  sensitive   = false
}

output "storage_bucket_url" {
  description = "URL for accessing the storage bucket/container"
  value       = module.storage.storage_bucket_url
  sensitive   = false
}

output "api_endpoint" {
  description = "The endpoint URL for the API gateway"
  value       = module.api.api_endpoint
  sensitive   = false
}

output "api_key" {
  description = "API key for authenticating with cloud services"
  value       = module.api.api_key
  sensitive   = true
}

output "resource_prefix" {
  description = "Prefix used for naming cloud resources"
  value       = local.resource_prefix
  sensitive   = false
}

output "environment" {
  description = "Deployment environment (dev, staging, prod)"
  value       = var.environment
  sensitive   = false
}

output "backup_enabled" {
  description = "Indicates that cloud backup is enabled and configured"
  value       = true
  sensitive   = false
}