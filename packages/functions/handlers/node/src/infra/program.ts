import * as pulumi from "@pulumi/pulumi";

import { Account } from "./components/account";
import { Api } from "./components/api";
import { Config } from "./components/config";
import { Events } from "./components/events";
import { Functions } from "./components/functions";
import { Router } from "./components/router";
import { Ssl } from "./components/ssl";
import { Storage } from "./components/storage";
import { useResource, withResource } from "./resource";

import type { Tenant } from "@paperwait/core/tenants/sql";

export const getProgram = (tenantId: Tenant["id"]) => async () =>
  withResource(() => {
    const account = Account.getInstance({ tenantId });

    const ssl = Ssl.getInstance(
      { tenantId },
      { providers: [account.provider] },
    );

    const functions = Functions.getInstance(
      { accountId: account.id },
      { providers: [account.provider] },
    );

    const api = Api.getInstance(
      {
        domainName: ssl.domainName,
        certificateArn: ssl.certificateArn,
        papercutSecureBridgeFunctionArn: functions.papercutSecureBridgeArn,
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
          assets: { url: storage.buckets.assets.url },
          documents: { url: storage.buckets.documents.url },
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

    Events.getInstance(
      {
        userSync: {
          functionArn: pulumi.output(useResource().UserSync.functionArn),
          scheduleExpression: "TODO",
          timezone: "TODO",
        },
        tailscaleAuthKeyRotation: {
          functionArn: functions.tailscaleAuthKeyRotationArn,
        },
      },
      { providers: [account.provider] },
    );
  });
