export const natSshKey = new tls.PrivateKey("NatSshKey", {
  algorithm: "ED25519",
});

export const natKeyPair = new aws.ec2.KeyPair("NatKeyPair", {
  publicKey: natSshKey.publicKeyOpenssh,
});

export const vpc = new aws.ec2.Vpc("Vpc", {
  cidrBlock: "10.0.0.0/16",
  enableDnsHostnames: true,
  enableDnsSupport: true,
});

export const internetGateway = new aws.ec2.InternetGateway("InternetGateway", {
  vpcId: vpc.id,
});

export const defaultRouteTable = new aws.ec2.DefaultRouteTable(
  "DefaultRouteTable",
  {
    defaultRouteTableId: vpc.defaultRouteTableId,
  },
);

export const internetRoute = new aws.ec2.Route("InternetRoute", {
  routeTableId: defaultRouteTable.id,
  destinationCidrBlock: "0.0.0.0/0",
  gatewayId: internetGateway.id,
});

export const natRouteTable = new aws.ec2.RouteTable("NatRouteTable", {
  vpcId: vpc.id,
});

const availabilityZones = aws.getAvailabilityZonesOutput({
  state: "available",
});

export const publicSubnetsOutput = availabilityZones.apply((zones) =>
  zones.names.map(
    (availabilityZone, index) =>
      new aws.ec2.Subnet(`PublicSubnet${index}`, {
        vpcId: vpc.id,
        availabilityZone,
        cidrBlock: `10.0.${index * 32}.0/22`,
        mapPublicIpOnLaunch: true,
      }),
  ),
);

export const privateSubnetsOutput = availabilityZones.apply((zones) =>
  zones.names.map(
    (availabilityZone, index) =>
      new aws.ec2.Subnet(`PrivateSubnet${index}`, {
        vpcId: vpc.id,
        availabilityZone,
        cidrBlock: `10.0.${index * 32 + 16}.0/22`,
        mapPublicIpOnLaunch: false,
      }),
  ),
);

export const privateRouteTableAssociationsOutput = privateSubnetsOutput.apply(
  (privateSubnets) =>
    privateSubnets.map(
      (privateSubnet, index) =>
        new aws.ec2.RouteTableAssociation(
          `PrivateRouteTableAssociation${index}`,
          {
            routeTableId: natRouteTable.id,
            subnetId: privateSubnet.id,
          },
        ),
    ),
);

export const natSecurityGroup = new aws.ec2.SecurityGroup("NatSecurityGroup", {
  vpcId: vpc.id,
  egress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  ingress: [
    {
      protocol: "-1",
      fromPort: 0,
      toPort: 0,
      cidrBlocks: ["10.0.0.0/16"],
    },
    {
      protocol: "tcp",
      fromPort: 22,
      toPort: 22,
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
});

export const natInstance = publicSubnetsOutput.apply(
  ([publicSubnet]) =>
    new aws.ec2.Instance("NatInstance", {
      ami: "ami-0b4663f70960f209a",
      instanceType: "t2.micro",
      associatePublicIpAddress: true,
      keyName: natKeyPair.keyName,
      sourceDestCheck: false,
      subnetId: publicSubnet.id,
      vpcSecurityGroupIds: [natSecurityGroup.id],
      tags: {
        Name: "nat-instance",
      },
    }),
);

export const natRoute = new aws.ec2.Route("NatRoute", {
  routeTableId: natRouteTable.id,
  destinationCidrBlock: "0.0.0.0/0",
  networkInterfaceId: natInstance.primaryNetworkInterfaceId,
});
