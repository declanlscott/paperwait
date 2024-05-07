export const vpc = new aws.ec2.Vpc("Vpc", {
  tags: { Name: "paperwait-vpc" },
  cidrBlock: "10.0.0.0/16",
});

// Public
export const publicSubnet = new aws.ec2.Subnet("PublicSubnet", {
  vpcId: vpc.id,
  cidrBlock: "10.0.1.0/24",
  availabilityZone: $interpolate`${aws.getRegionOutput().name}a`,
});
export const igw = new aws.ec2.InternetGateway("InternetGateway", {
  vpcId: vpc.id,
});
export const publicRouteTable = new aws.ec2.RouteTable("PublicRouteTable", {
  vpcId: vpc.id,
  routes: [
    {
      cidrBlock: "0.0.0.0/0",
      gatewayId: igw.id,
    },
  ],
});
new aws.ec2.RouteTableAssociation("PublicRouteTableAssociation", {
  subnetId: publicSubnet.id,
  routeTableId: publicRouteTable.id,
});

// Private
export const privateSubnet = new aws.ec2.Subnet("PrivateSubnet", {
  vpcId: vpc.id,
  cidrBlock: "10.0.2.0/24",
  availabilityZone: $interpolate`${aws.getRegionOutput().name}a`,
});
export const privateRouteTable = new aws.ec2.RouteTable("PrivateRouteTable", {
  vpcId: vpc.id,
});
new aws.ec2.RouteTableAssociation("PrivateRouteTableAssociation", {
  subnetId: privateSubnet.id,
  routeTableId: privateRouteTable.id,
});

// TODO: Reconsider this in the future
// I am trying to keep costs low, so for now instead of NAT Gateway I am using a NAT instance with `fck-nat` on the cheapest instance type, saving ~$30/month
export const fckNatSg = new aws.ec2.SecurityGroup("FckNatSg", {
  name: "fck-nat-sg",
  vpcId: vpc.id,
  ingress: [
    {
      description: "VPC CIDR",
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      cidrBlocks: [vpc.cidrBlock],
    },
  ],
  egress: [
    {
      description: "All traffic",
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      cidrBlocks: ["0.0.0.0/0"],
      ipv6CidrBlocks: ["::/0"],
    },
  ],
});
export const fckNatEni = new aws.ec2.NetworkInterface("FckNatEni", {
  description: "fck-nat network interface",
  subnetId: publicSubnet.id,
  securityGroups: [fckNatSg.id],
  sourceDestCheck: false,
});
const assumeRole = aws.iam.getPolicyDocument({
  statements: [
    {
      actions: ["sts:AssumeRole"],
      effect: "Allow",
      principals: [
        {
          type: "Service",
          identifiers: ["ec2.amazonaws.com"],
        },
      ],
    },
  ],
});
const manageEniPolicy = aws.iam.getPolicyDocument({
  statements: [
    {
      effect: "Allow",
      actions: [
        "ec2:AttachNetworkInterface",
        "ec2:ModifyNetworkInterfaceAttribute",
      ],
      resources: ["*"],
      conditions: [
        {
          test: "ForAnyValue:StringEquals",
          variable: "ec2:ResourceTag/Name",
          values: ["fck-nat"],
        },
      ],
    },
  ],
});
export const fckNatIamRole = new aws.iam.Role("FckNatIamRole", {
  assumeRolePolicy: assumeRole.then((assumeRole) => assumeRole.json),
  inlinePolicies: [
    {
      name: "ManageNetworkInterface",
      policy: manageEniPolicy.then((manageEniPolicy) => manageEniPolicy.json),
    },
  ],
});
export const fckNatProfile = new aws.iam.InstanceProfile("FckNatProfile", {
  name: "fck-nat-profile",
  role: fckNatIamRole.name,
});
export const fckNat = new aws.ec2.Instance("FckNat", {
  tags: { Name: "fck-nat" },
  ami: "ami-0b4663f70960f209a",
  instanceType: "t2.micro",
  vpcSecurityGroupIds: [fckNatSg.id],
  iamInstanceProfile: fckNatProfile.name,
  subnetId: publicSubnet.id,
});
// Route traffic matching the default route to the NAT instance
export const fckNatRoute = new aws.ec2.Route("FckNatRoute", {
  routeTableId: privateRouteTable.id,
  destinationCidrBlock: "0.0.0.0/0",
  networkInterfaceId: fckNatEni.id,
});
