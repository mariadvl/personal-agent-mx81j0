# API Gateway Module for Personal AI Agent
# Supports AWS, GCP, and Azure

terraform {
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
}

# Local values
locals {
  api_name = "${var.resource_prefix}-api-${var.random_suffix}"
  api_description = "API for Personal AI Agent cloud services"
  api_stage_name = var.environment
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
  description = "Region to deploy API resources in"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "cors_allowed_origins" {
  description = "List of origins allowed to access API via CORS"
  type        = list(string)
  default     = ["*"]
}

variable "rate_limiting_enabled" {
  description = "Whether to enable rate limiting for API endpoints"
  type        = bool
  default     = true
}

variable "rate_limit_requests" {
  description = "Number of requests allowed per minute when rate limiting is enabled"
  type        = number
  default     = 60
}

variable "tags" {
  description = "Tags to apply to API resources"
  type        = map(string)
  default     = {}
}

# Generate a secure random API key
resource "random_password" "api_key" {
  length  = 32
  special = false
}

# AWS API Gateway resources
resource "aws_api_gateway_rest_api" "api" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  name        = local.api_name
  description = local.api_description
  tags        = var.tags
}

resource "aws_api_gateway_resource" "backup" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  rest_api_id = aws_api_gateway_rest_api.api[0].id
  parent_id   = aws_api_gateway_rest_api.api[0].root_resource_id
  path_part   = "backup"
}

resource "aws_api_gateway_method" "backup_post" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  rest_api_id      = aws_api_gateway_rest_api.api[0].id
  resource_id      = aws_api_gateway_resource.backup[0].id
  http_method      = "POST"
  authorization    = "API_KEY"
  api_key_required = true
}

resource "aws_api_gateway_integration" "backup_post" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  rest_api_id             = aws_api_gateway_rest_api.api[0].id
  resource_id             = aws_api_gateway_resource.backup[0].id
  http_method             = aws_api_gateway_method.backup_post[0].http_method
  type                    = "AWS"
  integration_http_method = "POST"
  uri                     = "arn:aws:apigateway:${var.region}:s3:path//{bucket}/{key}"
  credentials             = aws_iam_role.api_gateway[0].arn
  
  request_parameters = {
    "integration.request.path.bucket" = "method.request.path.bucket"
    "integration.request.path.key"    = "method.request.path.key"
  }
}

resource "aws_api_gateway_method_response" "backup_post_200" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  rest_api_id = aws_api_gateway_rest_api.api[0].id
  resource_id = aws_api_gateway_resource.backup[0].id
  http_method = aws_api_gateway_method.backup_post[0].http_method
  status_code = "200"
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = true
  }
}

resource "aws_api_gateway_integration_response" "backup_post" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  rest_api_id = aws_api_gateway_rest_api.api[0].id
  resource_id = aws_api_gateway_resource.backup[0].id
  http_method = aws_api_gateway_method.backup_post[0].http_method
  status_code = aws_api_gateway_method_response.backup_post_200[0].status_code
  
  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin" = "'${join(",", var.cors_allowed_origins)}'"
  }
}

resource "aws_api_gateway_deployment" "api" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  rest_api_id = aws_api_gateway_rest_api.api[0].id
  stage_name  = local.api_stage_name
  
  depends_on = [
    aws_api_gateway_integration.backup_post
  ]
}

resource "aws_api_gateway_api_key" "api" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  name    = "${local.api_name}-key"
  value   = random_password.api_key.result
  enabled = true
}

resource "aws_api_gateway_usage_plan" "api" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  name        = "${local.api_name}-usage-plan"
  description = "Usage plan for Personal AI Agent API"
  
  api_stages {
    api_id = aws_api_gateway_rest_api.api[0].id
    stage  = aws_api_gateway_deployment.api[0].stage_name
  }
  
  quota_settings {
    limit  = var.rate_limiting_enabled ? 1000 : null
    period = "DAY"
  }
  
  throttle_settings {
    burst_limit = var.rate_limiting_enabled ? var.rate_limit_requests * 2 : null
    rate_limit  = var.rate_limiting_enabled ? var.rate_limit_requests : null
  }
}

resource "aws_api_gateway_usage_plan_key" "api" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  key_id        = aws_api_gateway_api_key.api[0].id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.api[0].id
}

resource "aws_iam_role" "api_gateway" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  name = "${var.resource_prefix}-api-gateway-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "apigateway.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_policy" "s3_access" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  name = "${var.resource_prefix}-api-gateway-s3-policy"
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Effect   = "Allow"
        Resource = "arn:aws:s3:::${var.resource_prefix}-storage-${var.random_suffix}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "s3_access" {
  count = var.cloud_provider == "aws" ? 1 : 0
  
  role       = aws_iam_role.api_gateway[0].name
  policy_arn = aws_iam_policy.s3_access[0].arn
}

# Google Cloud API Gateway resources
resource "google_api_gateway_api" "api" {
  count = var.cloud_provider == "gcp" ? 1 : 0
  
  provider     = google
  api_id       = replace(local.api_name, "-", "")
  display_name = local.api_description
}

resource "google_api_gateway_api_config" "api" {
  count = var.cloud_provider == "gcp" ? 1 : 0
  
  provider      = google
  api           = google_api_gateway_api.api[0].api_id
  api_config_id = "${replace(local.api_name, "-", "")}-config"
  display_name  = "${local.api_description} Config"
  
  openapi_documents {
    document {
      path     = "openapi.yaml"
      contents = base64encode(yamlencode({
        openapi = "3.0.0"
        info = {
          title   = local.api_description
          version = "1.0.0"
        }
        paths = {
          "/backup" = {
            post = {
              security = [{
                api_key = []
              }]
              x-google-backend = {
                address = "https://storage.googleapis.com/${var.resource_prefix}-storage-${var.random_suffix}/{bucket}/{object}"
              }
              responses = {
                "200" = {
                  description = "Successful operation"
                }
              }
            }
          }
        }
        components = {
          securitySchemes = {
            api_key = {
              type = "apiKey"
              name = "x-api-key"
              in   = "header"
            }
          }
        }
      }))
    }
  }
  
  gateway_config {
    backend_config {
      google_service_account = google_service_account.api_gateway[0].email
    }
  }
}

resource "google_api_gateway_gateway" "api" {
  count = var.cloud_provider == "gcp" ? 1 : 0
  
  provider     = google
  api_config   = google_api_gateway_api_config.api[0].id
  gateway_id   = replace(local.api_name, "-", "")
  display_name = local.api_name
  region       = var.region
  labels       = var.tags
}

resource "google_service_account" "api_gateway" {
  count = var.cloud_provider == "gcp" ? 1 : 0
  
  provider     = google
  account_id   = "${replace(local.api_name, "-", "")}-sa"
  display_name = "Service Account for ${local.api_name}"
}

resource "google_storage_bucket_iam_member" "api_gateway" {
  count = var.cloud_provider == "gcp" ? 1 : 0
  
  provider = google
  bucket   = "${var.resource_prefix}-storage-${var.random_suffix}"
  role     = "roles/storage.objectAdmin"
  member   = "serviceAccount:${google_service_account.api_gateway[0].email}"
}

resource "google_apikeys_key" "api" {
  count = var.cloud_provider == "gcp" ? 1 : 0
  
  provider     = google
  name         = "${local.api_name}-key"
  display_name = "API Key for ${local.api_name}"
  
  restrictions {
    api_targets {
      service = "apigateway.googleapis.com"
    }
  }
}

# Azure API Management resources
resource "azurerm_api_management" "api" {
  count = var.cloud_provider == "azure" ? 1 : 0
  
  name                = replace(local.api_name, "-", "")
  location            = var.region
  resource_group_name = "${var.resource_prefix}-rg"
  publisher_name      = "Personal AI Agent"
  publisher_email     = "admin@example.com"
  sku_name            = "Consumption_0"
  tags                = var.tags
}

resource "azurerm_api_management_api" "backup" {
  count = var.cloud_provider == "azure" ? 1 : 0
  
  name                = "backup-api"
  resource_group_name = "${var.resource_prefix}-rg"
  api_management_name = azurerm_api_management.api[0].name
  revision            = "1"
  display_name        = local.api_description
  path                = "backup"
  protocols           = ["https"]
}

resource "azurerm_api_management_operation" "backup" {
  count = var.cloud_provider == "azure" ? 1 : 0
  
  operation_id        = "backup-operation"
  api_name            = azurerm_api_management_api.backup[0].name
  api_management_name = azurerm_api_management.api[0].name
  resource_group_name = "${var.resource_prefix}-rg"
  display_name        = "Backup Operation"
  method              = "POST"
  url_template        = "/"
  description         = "Operation for backup and restore functions"
}

resource "azurerm_api_management_backend" "storage" {
  count = var.cloud_provider == "azure" ? 1 : 0
  
  name                = "storage-backend"
  resource_group_name = "${var.resource_prefix}-rg"
  api_management_name = azurerm_api_management.api[0].name
  protocol            = "http"
  url                 = "https://${replace(local.api_name, "-", "")}.blob.core.windows.net/backups"
}

resource "azurerm_api_management_policy" "backup" {
  count = var.cloud_provider == "azure" ? 1 : 0
  
  api_name            = azurerm_api_management_api.backup[0].name
  api_management_name = azurerm_api_management.api[0].name
  resource_group_name = "${var.resource_prefix}-rg"
  
  xml_content = <<XML
<policies>
  <inbound>
    <base />
    <cors>
      <allowed-origins>
        <origin>${join("</origin>\n        <origin>", var.cors_allowed_origins)}</origin>
      </allowed-origins>
      <allowed-methods>
        <method>GET</method>
        <method>POST</method>
        <method>PUT</method>
        <method>DELETE</method>
      </allowed-methods>
      <allowed-headers>
        <header>*</header>
      </allowed-headers>
    </cors>
    <rate-limit calls="${var.rate_limiting_enabled ? var.rate_limit_requests : 1000}" renewal-period="60" />
    <set-backend-service backend-id="${azurerm_api_management_backend.storage[0].name}" />
  </inbound>
</policies>
XML
}

resource "azurerm_api_management_subscription" "api" {
  count = var.cloud_provider == "azure" ? 1 : 0
  
  resource_group_name = "${var.resource_prefix}-rg"
  api_management_name = azurerm_api_management.api[0].name
  display_name        = "${local.api_name} Subscription"
  state               = "active"
  primary_key         = random_password.api_key.result
  subscription_id     = "${local.api_name}-subscription"
}

resource "azurerm_role_assignment" "storage" {
  count = var.cloud_provider == "azure" ? 1 : 0
  
  scope                = "${var.resource_prefix}-storage-${var.random_suffix}"
  role_definition_name = "Storage Blob Data Contributor"
  principal_id         = azurerm_api_management.api[0].identity[0].principal_id
}

# Outputs
output "api_endpoint" {
  description = "The endpoint URL for the API gateway"
  value = var.cloud_provider == "aws" ? "https://${aws_api_gateway_rest_api.api[0].id}.execute-api.${var.region}.amazonaws.com/${aws_api_gateway_deployment.api[0].stage_name}" : var.cloud_provider == "gcp" ? "https://${google_api_gateway_gateway.api[0].default_hostname}" : "https://${azurerm_api_management.api[0].gateway_url}/${azurerm_api_management_api.backup[0].path}"
  sensitive = false
}

output "api_key" {
  description = "API key for authenticating with cloud services"
  value       = random_password.api_key.result
  sensitive   = true
}