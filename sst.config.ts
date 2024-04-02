// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

import { ClientPrefix } from "~/lib/client-resource";
import env from "./env";

const { AWS_ORG_NAME, AWS_REGION, AWS_RDS_PROXY_ENDPOINT } = env;

export default $config({
  app(input) {
    return {
      name: "paperwait",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          profile:
            input?.stage === "production"
              ? `${AWS_ORG_NAME}-production`
              : `${AWS_ORG_NAME}-dev`,
          region: AWS_REGION,
        },
      },
    };
  },
  async run() {
    // TODO: Create VPC/subnets instead of using defaults and properly setup security groups/rules
    const defaultVpc = new aws.ec2.DefaultVpc("DefaultVpc");
    const defaultAz1 = new aws.ec2.DefaultSubnet("DefaultAz1", {
      availabilityZone: `${AWS_REGION}a`,
    });
    const defaultAz2 = new aws.ec2.DefaultSubnet("DefaultAz2", {
      availabilityZone: `${AWS_REGION}b`,
    });
    const defaultAz3 = new aws.ec2.DefaultSubnet("DefaultAz3", {
      availabilityZone: `${AWS_REGION}c`,
    });

    const rdsUsername = new sst.Secret("RdsUsername");
    const rdsPassword = new sst.Secret("RdsPassword");
    const rdsPortNumber = 5432;
    const rdsPort = new sst.Secret("RdsPort", String(rdsPortNumber));

    const replicacheLicenseKey = new sst.Secret(
      `${ClientPrefix}ReplicacheLicenseKey`,
    );

    const rds = new aws.rds.Instance("PaperwaitDB", {
      identifier: "paperwait-db",
      dbName: "paperwait",
      engine: "postgres",
      engineVersion: "16.2",
      username: rdsUsername.value,
      password: rdsPassword.value,
      port: rdsPortNumber,
      instanceClass: aws.rds.InstanceType.T4G_Micro,
      storageType: "gp2",
      allocatedStorage: 10,
      maxAllocatedStorage: 10,
      multiAz: false,
      performanceInsightsEnabled: true,
      performanceInsightsRetentionPeriod: 7,
    });

    const rdsCredentials = new aws.secretsmanager.Secret(
      "PaperwaitRDSCredentials",
      { name: "paperwait-rds-credentials" },
    );
    new aws.secretsmanager.SecretVersion("PaperwaitRDSCredentialsVersion", {
      secretId: rdsCredentials.id,
      secretString: $jsonStringify({
        username: rds.username,
        password: rds.password,
        engine: rds.engine,
        host: rds.address,
        port: rds.port,
        dbname: rds.dbName,
        dbInstanceIdentifier: rds.identifier,
      }),
    });

    const rdsProxyRole = new aws.iam.Role("PaperwaitRDSProxyRole", {
      name: "paperwait-rds-proxy-role",
      assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: {
              Service: "rds.amazonaws.com",
            },
            Action: "sts:AssumeRole",
          },
        ],
      }),
    });
    const rdsProxyRolePolicy = new aws.iam.Policy(
      "PaperwaitRDSProxyRolePolicy",
      {
        name: "paperwait-rds-proxy-role-policy",
        policy: $jsonStringify({
          Version: "2012-10-17",
          Statement: [
            {
              Sid: "GetSecretValue",
              Action: ["secretsmanager:GetSecretValue"],
              Effect: "Allow",
              Resource: [rdsCredentials.arn],
            },
            {
              Sid: "DecryptSecretValue",
              Action: ["kms:Decrypt"],
              Effect: "Allow",
              Resource: [
                aws.kms.getAliasOutput({ name: "alias/aws/secretsmanager" })
                  .arn,
              ],
              Condition: {
                StringEquals: {
                  "kms:ViaService": `secretsmanager.${AWS_REGION}.amazonaws.com`,
                },
              },
            },
          ],
        }),
      },
    );
    new aws.iam.RolePolicyAttachment("PaperwaitRDSProxyRolePolicyAttachment", {
      role: rdsProxyRole.name,
      policyArn: rdsProxyRolePolicy.arn,
    });

    const rdsProxy = new aws.rds.Proxy("PaperwaitRDSProxy", {
      name: "paperwait-rds-proxy",
      engineFamily: "POSTGRESQL",
      auths: [
        {
          authScheme: "SECRETS",
          iamAuth: "DISABLED",
          secretArn: rdsCredentials.arn,
        },
      ],
      roleArn: rdsProxyRole.arn,
      requireTls: true,
      vpcSecurityGroupIds: [defaultVpc.defaultSecurityGroupId],
      vpcSubnetIds: [defaultAz1.id, defaultAz2.id, defaultAz3.id],
    });
    const rdsProxyTargetGroup = new aws.rds.ProxyDefaultTargetGroup(
      "PaperwaitRDSProxyTargetGroup",
      { dbProxyName: rdsProxy.name },
    );
    new aws.rds.ProxyTarget("PaperwaitRDSProxyTarget", {
      dbInstanceIdentifier: rds.identifier,
      dbProxyName: rdsProxy.name,
      targetGroupName: rdsProxyTargetGroup.name,
    });

    // TODO: Link RDS Proxy to Astro once SST implements and documents `$linkable` global, for now just use environment variables

    new sst.aws.Astro("Paperwait", {
      link: [replicacheLicenseKey, rdsUsername, rdsPassword, rdsPort],
      transform: {
        server: {
          handler: "dist/server/entry.handler",
          vpc: {
            securityGroups: [defaultVpc.defaultSecurityGroupId],
            subnets: [defaultAz1.id, defaultAz2.id, defaultAz3.id],
          },
          environment: {
            AWS_RDS_PROXY_ENDPOINT,
          },
        },
      },
    });
  },
});
