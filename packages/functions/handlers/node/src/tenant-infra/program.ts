import { Account } from "./components/account";
import { Api } from "./components/api";
import { Config } from "./components/config";
import { PapercutSecureBridge } from "./components/papercut-secure-bridge";
import { Router } from "./components/router";
import { Ssl } from "./components/ssl";
import { Storage } from "./components/storage";

import type { Tenant } from "@paperwait/core/tenants/sql";

export const getProgram = (tenantId: Tenant["id"]) => async () => {
  const account = Account.getInstance({ tenantId });

  const ssl = Ssl.getInstance({ tenantId }, { providers: [account.provider] });

  const papercutSecureBridge = PapercutSecureBridge.getInstance(
    { accountId: account.id },
    { providers: [account.provider] },
  );

  const api = Api.getInstance(
    {
      domainName: ssl.domainName,
      certificateArn: ssl.certificateArn,
      papercutSecureBridgeFunctionArn: papercutSecureBridge.functionArn,
    },
    { providers: [account.provider] },
  );

  const storage = Storage.getInstance({ providers: [account.provider] });

  const router = Router.getInstance(
    {
      domainName: ssl.domainName,
      certificateArn: ssl.certificateArn,
      routes: {
        api: { url: api.invokeUrl },
        assets: { url: storage.assets.url },
        documents: { url: storage.documents.url },
      },
    },
    { providers: [account.provider] },
  );

  Config.getInstance(
    {
      cloudfrontKeyPairId: router.keyPairId,
      cloudfrontPrivateKey: router.privateKey,
    },
    { providers: [account.provider] },
  );
};
