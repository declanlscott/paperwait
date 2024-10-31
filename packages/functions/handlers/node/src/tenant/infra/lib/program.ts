import { nanoIdSchema } from "@paperwait/core/utils/shared";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as v from "valibot";

import { Account } from "./components/account";
import { Api } from "./components/api";
import { Events } from "./components/events";
import { Functions } from "./components/functions";
import { Router } from "./components/router";
import { Ssl } from "./components/ssl";
import { Storage } from "./components/storage";
import { useResource, withResource } from "./resource";

export const programInputSchema = v.object({
  tenantId: nanoIdSchema,
  usersSyncSchedule: v.optional(v.string(), "55 1 * * ? *"),
  timezone: v.picklist(Intl.supportedValuesOf("timeZone")),
});

export type ProgramInput = v.InferOutput<typeof programInputSchema>;

export const getProgram = (input: ProgramInput) => async () =>
  withResource(() => {
    const { tenantId, usersSyncSchedule, timezone } = input;

    const { AppData, Cloud, CloudfrontPublicKey, OrdersProcessor, UsersSync } =
      useResource();

    const account = Account.getInstance({ tenantId });

    const cloudfrontPublicKey = new aws.cloudfront.PublicKey(
      "CloudfrontPublicKey",
      { encodedKey: CloudfrontPublicKey.pem },
      { provider: account.provider },
    );

    const ssl = Ssl.getInstance(
      { tenantId },
      { providers: [account.provider] },
    );

    const functions = Functions.getInstance(
      { accountId: account.id },
      { providers: [account.provider] },
    );

    const storage = Storage.getInstance({ providers: [account.provider] });

    const gateway = new aws.apigateway.RestApi(
      "Gateway",
      { endpointConfiguration: { types: "REGIONAL" } },
      { provider: account.provider },
    );

    const router = Router.getInstance(
      {
        domainName: ssl.domainName,
        certificateArn: ssl.certificateArn,
        keyPairId: cloudfrontPublicKey.id,
        routes: {
          api: {
            url: pulumi.interpolate`https://${gateway.id}.execute-api.${Cloud.aws.region}.amazonaws.com/${AppData.stage}`,
          },
          assets: { url: storage.buckets.assets.url },
          documents: { url: storage.buckets.documents.url },
        },
      },
      { providers: [account.provider] },
    );

    Api.getInstance(
      {
        gateway,
        tenantId,
        domainName: ssl.domainName,
        certificateArn: ssl.certificateArn,
        cloudfrontKeyPairId: cloudfrontPublicKey.id,
        papercutSecureBridgeFunction: {
          invokeArn: functions.papercutSecureBridge.invokeArn,
        },
        ordersProcessorQueue: {
          arn: storage.queues.ordersProcessor.arn,
          name: storage.queues.ordersProcessor.name,
          url: storage.queues.ordersProcessor.url,
        },
        distributionId: router.distributionId,
      },
      { providers: [account.provider] },
    );

    Events.getInstance(
      {
        tenantId,
        domainName: ssl.domainName,
        events: {
          tailscaleAuthKeyRotation: {
            functionArn: functions.tailscaleAuthKeyRotation.functionArn,
          },
          usersSync: {
            functionArn: pulumi.output(UsersSync.arn),
            scheduleExpression: `cron(${usersSyncSchedule})`,
            timezone,
          },
          ordersProcessor: {
            queueArn: storage.queues.ordersProcessor.arn,
            functionArn: pulumi.output(OrdersProcessor.arn),
          },
        },
      },
      { providers: [account.provider] },
    );
  });
