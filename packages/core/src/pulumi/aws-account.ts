import * as aws from "@pulumi/aws";
import { Resource } from "sst";

import type { Organization } from "../organizations/sql";

export const getProgram = (tenantId: Organization["id"]) => async () => {
  const accountName = `${Resource.Meta.app.name}-${Resource.Meta.app.stage}-tenant-${tenantId}`;

  const emailSegments = Resource.Meta.awsOrgRootEmail.split("@");

  const account = new aws.organizations.Account(`Tenant-${tenantId}-Account`, {
    name: accountName,
    email: `${emailSegments[0]}+${accountName}@${emailSegments[1]}`,
    parentId: Resource.Meta.tenantsOrganizationalUnitId,
  });

  return {
    accountId: account.id,
    accountUrn: account.urn,
  };
};
