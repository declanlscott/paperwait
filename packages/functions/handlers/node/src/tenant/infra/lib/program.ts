import { nanoIdSchema } from "@paperwait/core/utils/shared";
import * as pulumi from "@pulumi/pulumi";
import * as v from "valibot";

import { Account } from "./components/account";
import { Api } from "./components/api";
import { Config } from "./components/config";
import { Events } from "./components/events";
import { Functions } from "./components/functions";
import { Router } from "./components/router";
import { Ssl } from "./components/ssl";
import { Storage } from "./components/storage";
import { useResource, withResource } from "./resource";

export const programInputSchema = v.object({
  tenantId: nanoIdSchema,
  userSyncSchedule: v.optional(v.string(), "55 1 * * ? *"),
  timezone: v.picklist(Intl.supportedValuesOf("timeZone")),
});

export type ProgramInput = v.InferOutput<typeof programInputSchema>;

export const getProgram = (input: ProgramInput) => async () =>
  withResource(() => {
    const { tenantId, userSyncSchedule, timezone } = input;

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
        tenantId,
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
        tenantId,
        events: {
          tailscaleAuthKeyRotation: {
            functionArn: functions.tailscaleAuthKeyRotationArn,
          },
          userSync: {
            functionArn: pulumi.output(useResource().UserSync.arn),
            scheduleExpression: `cron(${userSyncSchedule})`,
            timezone,
          },
        },
      },
      { providers: [account.provider] },
    );
  });
