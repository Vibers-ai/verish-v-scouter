variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "ap-northeast-2"
}

variable "app_name" {
  description = "Name of the application"
  type        = string
  default     = "verish-influencer-app"
}

variable "bucket_name" {
  description = "S3 bucket name (must be globally unique)"
  type        = string
  # You should change this to something unique
  default     = "verish-influencer-app-prod"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "domain_name" {
  description = "Custom domain name (optional)"
  type        = string
  default     = ""
}