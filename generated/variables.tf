variable "environment" {
  description = "Target deployment environment"
  type        = string
  default     = "production"
}

variable "aws_region" {
  description = "Target AWS deployment region"
  type        = string
  default     = "us-east-1"
}
