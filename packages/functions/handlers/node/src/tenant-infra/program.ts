import { Account } from "./components/account";
import { Api } from "./components/api";
import { PapercutSecureBridge } from "./components/papercut-secure-bridge";
import { Storage } from "./components/storage";

import type { Tenant } from "@paperwait/core/tenants/sql";

export const getProgram = (tenantId: Tenant["id"]) => async () => {
  const account = Account.getInstance({ tenantId });

  const papercutSecureBridge = PapercutSecureBridge.getInstance(
    { accountId: account.id },
    { providers: { aws: account.provider } },
  );

  const api = Api.getInstance(
    {
      tenantId,
      papercutSecureBridgeFunctionArn: papercutSecureBridge.functionArn,
    },
    { providers: { aws: account.provider } },
  );

  const storage = Storage.getInstance({ providers: { aws: account.provider } });
};
