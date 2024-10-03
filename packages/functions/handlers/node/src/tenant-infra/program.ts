import { PapercutSecureBridge, TenantAccount, TenantApi } from "./components";

import type { Tenant } from "@paperwait/core/tenants/sql";

// TODO: finish implementing this function

export const getProgram = (tenantId: Tenant["id"]) => async () => {
  const tenantAccount = TenantAccount.getInstance({ tenantId });

  const papercutSecureBridge = PapercutSecureBridge.getInstance({
    providers: { aws: tenantAccount.nodes.provider },
  });

  const tenantApi = TenantApi.getInstance(
    {
      tenantId,
      papercutSecureBridgeFunctionArn: papercutSecureBridge.nodes.function.arn,
    },
    { providers: { aws: tenantAccount.nodes.provider } },
  );
};
