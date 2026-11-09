output "canvas_vpc_id" {
  description = "The ID of the VPC."
  value       = aws_vpc.canvas_vpc.id
}

output "canvas_vpc_cidr_block" {
  description = "The primary CIDR block of the VPC."
  value       = aws_vpc.canvas_vpc.cidr_block
}

output "canvas_subnet_id" {
  description = "The ID of the Subnet."
  value       = aws_subnet.canvas_subnet.id
}

output "canvas_subnet_cidr_block" {
  description = "The CIDR block of the Subnet."
  value       = aws_subnet.canvas_subnet.cidr_block
}
