resource "aws_vpc" "canvas_vpc" {
  cidr_block                       = "10.0.0.0/16"
  instance_tenancy                 = "default"
  enable_dns_hostnames             = true
  enable_dns_support               = true
  assign_generated_ipv6_cidr_block = false
  tags = {
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

resource "aws_subnet" "canvas_subnet" {
  cidr_block                      = "10.0.1.0/24"
  vpc_id                          = aws_vpc.canvas_vpc.id
  map_public_ip_on_launch         = false
  assign_ipv6_address_on_creation = false
  tags = {
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}
