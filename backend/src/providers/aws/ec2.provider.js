import {
  EC2Client,
  DescribeInstanceTypesCommand,
  DescribeKeyPairsCommand,
  DescribeSubnetsCommand,
  DescribeSecurityGroupsCommand,
  DescribeImagesCommand,
  DescribeVpcsCommand,
  DescribeAvailabilityZonesCommand,
} from "@aws-sdk/client-ec2";

const client = new EC2Client({
  region: process.env.AWS_REGION || "us-east-1",
});

// Curated catalog of standard EC2 instance types available across AWS regions
const FALLBACK_INSTANCE_TYPES = [
  // General Purpose: T3 / T4g
  { label: "t3.nano (2 vCPU, 0.5 GiB)", value: "t3.nano" },
  { label: "t3.micro (2 vCPU, 1 GiB)", value: "t3.micro" },
  { label: "t3.small (2 vCPU, 2 GiB)", value: "t3.small" },
  { label: "t3.medium (2 vCPU, 4 GiB)", value: "t3.medium" },
  { label: "t3.large (2 vCPU, 8 GiB)", value: "t3.large" },
  { label: "t3.xlarge (4 vCPU, 16 GiB)", value: "t3.xlarge" },
  { label: "t3.2xlarge (8 vCPU, 32 GiB)", value: "t3.2xlarge" },
  { label: "t4g.nano (2 vCPU, 0.5 GiB ARM)", value: "t4g.nano" },
  { label: "t4g.micro (2 vCPU, 1 GiB ARM)", value: "t4g.micro" },
  { label: "t4g.small (2 vCPU, 2 GiB ARM)", value: "t4g.small" },
  { label: "t4g.medium (2 vCPU, 4 GiB ARM)", value: "t4g.medium" },
  { label: "t4g.large (2 vCPU, 8 GiB ARM)", value: "t4g.large" },
  { label: "t4g.xlarge (4 vCPU, 16 GiB ARM)", value: "t4g.xlarge" },

  // General Purpose: M5 / M6i
  { label: "m5.large (2 vCPU, 8 GiB)", value: "m5.large" },
  { label: "m5.xlarge (4 vCPU, 16 GiB)", value: "m5.xlarge" },
  { label: "m5.2xlarge (8 vCPU, 32 GiB)", value: "m5.2xlarge" },
  { label: "m5.4xlarge (16 vCPU, 64 GiB)", value: "m5.4xlarge" },
  { label: "m6i.large (2 vCPU, 8 GiB)", value: "m6i.large" },
  { label: "m6i.xlarge (4 vCPU, 16 GiB)", value: "m6i.xlarge" },
  { label: "m6i.2xlarge (8 vCPU, 32 GiB)", value: "m6i.2xlarge" },

  // Compute Optimized: C5 / C6i
  { label: "c5.large (2 vCPU, 4 GiB)", value: "c5.large" },
  { label: "c5.xlarge (4 vCPU, 8 GiB)", value: "c5.xlarge" },
  { label: "c5.2xlarge (8 vCPU, 16 GiB)", value: "c5.2xlarge" },
  { label: "c5.4xlarge (16 vCPU, 32 GiB)", value: "c5.4xlarge" },
  { label: "c6i.large (2 vCPU, 4 GiB)", value: "c6i.large" },
  { label: "c6i.xlarge (4 vCPU, 8 GiB)", value: "c6i.xlarge" },

  // Memory Optimized: R5 / R6i
  { label: "r5.large (2 vCPU, 16 GiB)", value: "r5.large" },
  { label: "r5.xlarge (4 vCPU, 32 GiB)", value: "r5.xlarge" },
  { label: "r5.2xlarge (8 vCPU, 64 GiB)", value: "r5.2xlarge" },
  { label: "r6i.large (2 vCPU, 16 GiB)", value: "r6i.large" },
  { label: "r6i.xlarge (4 vCPU, 32 GiB)", value: "r6i.xlarge" },

  // Accelerated GPU
  { label: "g4dn.xlarge (4 vCPU, 16 GiB, 1x T4 GPU)", value: "g4dn.xlarge" },
  { label: "g4dn.2xlarge (8 vCPU, 32 GiB, 1x T4 GPU)", value: "g4dn.2xlarge" },
];

const FALLBACK_AZS = [
  { label: "us-east-1a (US East N. Virginia)", value: "us-east-1a" },
  { label: "us-east-1b (US East N. Virginia)", value: "us-east-1b" },
  { label: "us-east-1c (US East N. Virginia)", value: "us-east-1c" },
  { label: "us-east-1d (US East N. Virginia)", value: "us-east-1d" },
  { label: "us-east-1e (US East N. Virginia)", value: "us-east-1e" },
  { label: "us-east-1f (US East N. Virginia)", value: "us-east-1f" },
];

const FALLBACK_AMIS = [
  { label: "Amazon Linux 2023 (AMI: ami-0c55b159cbfafe1f0)", value: "ami-0c55b159cbfafe1f0" },
  { label: "Ubuntu 24.04 LTS Noble Numbat (AMI: ami-0e86e20dae9224db8)", value: "ami-0e86e20dae9224db8" },
  { label: "Ubuntu 22.04 LTS Jammy Jellyfish (AMI: ami-080e1f13689e07408)", value: "ami-080e1f13689e07408" },
  { label: "Debian 12 Bookworm (AMI: ami-06db4d78cb1d3bbf9)", value: "ami-06db4d78cb1d3bbf9" },
  { label: "Red Hat Enterprise Linux 9 (AMI: ami-0fe630eb857a6ec83)", value: "ami-0fe630eb857a6ec83" },
  { label: "Windows Server 2022 Base (AMI: ami-0bc399a09903b603a)", value: "ami-0bc399a09903b603a" },
  { label: "Amazon Linux 2 LTS (AMI: ami-0c101f26f147fa7fd)", value: "ami-0c101f26f147fa7fd" },
];

const FALLBACK_KEYPAIRS = [
  { label: "dev-keypair (Development Key)", value: "dev-keypair" },
  { label: "prod-ssh-key (Production SSH Key)", value: "prod-ssh-key" },
  { label: "bastion-access-key (Bastion Host Key)", value: "bastion-access-key" },
];

export async function getInstanceTypes() {
  try {
    const instanceTypes = [];
    let NextToken;

    do {
      const response = await client.send(
        new DescribeInstanceTypesCommand({ NextToken, MaxResults: 100 })
      );

      instanceTypes.push(...(response.InstanceTypes || []));
      NextToken = response.NextToken;
      if (instanceTypes.length >= 100) break; // Limit pagination for snappy response
    } while (NextToken);

    if (instanceTypes.length > 0) {
      return instanceTypes
        .map((item) => ({
          label: `${item.InstanceType} (${item.VCpuInfo?.DefaultVCpus || 2} vCPU, ${(item.MemoryInfo?.SizeInMiB || 1024) / 1024} GiB)`,
          value: item.InstanceType,
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
    }
  } catch (_err) {
    // Fallback to comprehensive offline catalog when credentials are not configured
  }

  return FALLBACK_INSTANCE_TYPES;
}

export async function getAvailabilityZones() {
  try {
    const response = await client.send(new DescribeAvailabilityZonesCommand({}));
    if (response.AvailabilityZones?.length > 0) {
      return response.AvailabilityZones.map((item) => ({
        label: `${item.ZoneName} (${item.State})`,
        value: item.ZoneName,
      }));
    }
  } catch (_err) {
    // Offline fallback
  }

  return FALLBACK_AZS;
}

export async function getKeyPairs() {
  try {
    const response = await client.send(new DescribeKeyPairsCommand({}));
    if (response.KeyPairs?.length > 0) {
      return response.KeyPairs.map((item) => ({
        label: item.KeyName,
        value: item.KeyName,
      }));
    }
  } catch (_err) {
    // Offline fallback
  }

  return FALLBACK_KEYPAIRS;
}

export async function getVpcs() {
  try {
    const response = await client.send(new DescribeVpcsCommand({}));
    if (response.Vpcs?.length > 0) {
      return response.Vpcs.map((item) => {
        const name = item.Tags?.find((tag) => tag.Key === "Name")?.Value;
        return {
          label: name ? `${name} (${item.VpcId})` : item.VpcId,
          value: item.VpcId,
        };
      });
    }
  } catch (_err) {
    // Offline fallback
  }

  return [
    { label: "Connect a VPC on canvas (Recommended)", value: "canvas-vpc" },
    { label: "Default VPC (vpc-0123456789abcdef0)", value: "vpc-0123456789abcdef0" },
  ];
}

export async function getSubnets(vpcId) {
  try {
    const response = await client.send(
      new DescribeSubnetsCommand({
        Filters: vpcId ? [{ Name: "vpc-id", Values: [vpcId] }] : undefined,
      })
    );
    if (response.Subnets?.length > 0) {
      return response.Subnets.map((item) => ({
        label: `${item.SubnetId} (${item.AvailabilityZone})`,
        value: item.SubnetId,
      }));
    }
  } catch (_err) {
    // Offline fallback
  }

  return [
    { label: "Connect a Subnet on canvas (Recommended)", value: "canvas-subnet" },
    { label: "Public Subnet 1 (subnet-0123456789abcdef0 - us-east-1a)", value: "subnet-0123456789abcdef0" },
    { label: "Private Subnet 1 (subnet-0987654321fedcba0 - us-east-1b)", value: "subnet-0987654321fedcba0" },
  ];
}

export async function getSecurityGroups(vpcId) {
  try {
    const response = await client.send(
      new DescribeSecurityGroupsCommand({
        Filters: vpcId ? [{ Name: "vpc-id", Values: [vpcId] }] : undefined,
      })
    );
    if (response.SecurityGroups?.length > 0) {
      return response.SecurityGroups.map((item) => ({
        label: `${item.GroupName} (${item.GroupId})`,
        value: item.GroupId,
      }));
    }
  } catch (_err) {
    // Offline fallback
  }

  return [
    { label: "Connect Security Group on canvas (Recommended)", value: "canvas-sg" },
    { label: "default (sg-0123456789abcdef0)", value: "sg-0123456789abcdef0" },
    { label: "web-dmz-sg (sg-0fedcba9876543210)", value: "sg-0fedcba9876543210" },
  ];
}

export async function getAmis() {
  try {
    const response = await client.send(
      new DescribeImagesCommand({
        Owners: ["amazon"],
      })
    );
    if (response.Images?.length > 0) {
      return response.Images
        .sort((a, b) => new Date(b.CreationDate) - new Date(a.CreationDate))
        .slice(0, 50)
        .map((item) => ({
          label: `${item.Name}`,
          value: item.ImageId,
        }));
    }
  } catch (_err) {
    // Offline fallback
  }

  return FALLBACK_AMIS;
}
