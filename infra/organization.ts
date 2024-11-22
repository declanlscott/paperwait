import { bootstrapRoleArn } from "./secrets";

export const bootstrapProvider = new aws.Provider("BootstrapProvider", {
  assumeRole: {
    roleArn: bootstrapRoleArn.value,
  },
});

export const organizationManagementRole = new aws.iam.Role(
  "OrganizationManagementRole",
  {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
      AWS: $interpolate`arn:aws:iam::${aws.getCallerIdentityOutput().accountId}:root`,
    }),
    tags: {
      app: $app.name,
      stage: $app.stage,
    },
  },
  { provider: bootstrapProvider },
);

export const organizationManagementInlinePolicy = new aws.iam.RolePolicy(
  "OrganizationManagementInlinePolicy",
  {
    role: organizationManagementRole.name,
    policy: aws.iam.getPolicyDocumentOutput({
      statements: [
        {
          resources: ["*"],
          actions: ["organizations:*"],
        },
      ],
    }).json,
  },
  { provider: bootstrapProvider },
);

const organizationManagementPermissionPropagation = new time.Sleep(
  "OrganizationManagementPermissionPropagation",
  {
    createDuration: "5s",
    triggers: {
      assumeRolePolicy: organizationManagementRole.assumeRolePolicy,
      inlinePolicy: organizationManagementInlinePolicy.policy,
    },
  },
);

export const organizationManagementProvider = new aws.Provider(
  "OrganizationManagementProvider",
  {
    assumeRole: {
      roleArn: organizationManagementRole.arn,
    },
  },
  { dependsOn: organizationManagementPermissionPropagation },
);

export const organization = aws.organizations.getOrganizationOutput({
  provider: organizationManagementProvider,
});

export const organizationRoot = organization.roots.apply((roots) => {
  const root = roots.at(0);
  if (!root) throw new Error("Missing organization root");

  return root;
});

export const tenantsOrganizationalUnit =
  new aws.organizations.OrganizationalUnit(
    "TenantsOrganizationalUnit",
    {
      parentId: organizationRoot.id,
      tags: {
        app: $app.name,
        stage: $app.stage,
      },
    },
    { provider: organizationManagementProvider },
  );

export const tenantAccountAccessRoleName = "TenantAccountAccessRole";

export const tenantsPrincipalOrgPath = $resolve([
  organization.id,
  organizationRoot.id,
  tenantsOrganizationalUnit.id,
]).apply((segments) => `${segments.join("/")}/`);

new aws.iam.RolePolicyAttachment(
  "AssumeTenantAccountAccessPolicyAttachment",
  {
    role: organizationManagementRole.name,
    policyArn: new aws.iam.Policy(
      "AssumeTenantAccountAccessPolicy",
      {
        policy: aws.iam.getPolicyDocumentOutput({
          statements: [
            {
              actions: ["sts:AssumeRole"],
              resources: [
                $interpolate`arn:aws:iam::*:role/${tenantAccountAccessRoleName}`,
              ],
              conditions: [
                {
                  test: "ForAnyValue:StringEquals",
                  variable: "aws:PrincipalOrgPaths",
                  values: [tenantsPrincipalOrgPath],
                },
              ],
            },
          ],
        }).json,
        tags: {
          app: $app.name,
          stage: $app.stage,
        },
      },
      { provider: bootstrapProvider },
    ).arn,
  },
  { provider: bootstrapProvider },
);
