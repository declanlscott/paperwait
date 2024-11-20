import { nanoIdSchema } from "@printworks/core/utils/shared";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as v from "valibot";

import { Account } from "./components/account";
import { Api } from "./components/api";
import { Events } from "./components/events";
import { Functions } from "./components/functions";
import { Realtime } from "./components/realtime";
import { Router } from "./components/router";
import { Ssl } from "./components/ssl";
import { Storage } from "./components/storage";
import { useResource, withResource } from "./resource";

export const programInputSchema = v.object({
  tenantId: nanoIdSchema,
  usersSyncSchedule: v.pipe(v.optional(v.string(), "55 1 * * ? *"), v.trim()),
  timezone: v.picklist(Intl.supportedValuesOf("timeZone")),
  papercutServerUrl: v.pipe(v.string(), v.url(), v.trim()),
  papercutServerAuthToken: v.pipe(v.string(), v.trim()),
  tailscaleOauthClient: v.object({
    id: v.pipe(v.string(), v.trim()),
    secret: v.pipe(v.string(), v.trim()),
  }),
});

export type ProgramInput = v.InferOutput<typeof programInputSchema>;

export const getProgram = (input: ProgramInput) => async () =>
  withResource(() => {
    const {
      tenantId,
      usersSyncSchedule,
      timezone,
      papercutServerUrl,
      papercutServerAuthToken,
      tailscaleOauthClient,
    } = input;

    const { AppData, CloudfrontPublicKey, InvoicesProcessor, UsersSync } =
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

    const gateway = new aws.apigateway.RestApi(
      "Gateway",
      { endpointConfiguration: { types: "REGIONAL" } },
      { provider: account.provider },
    );

    const storage = Storage.getInstance(
      {
        papercutServer: {
          url: papercutServerUrl,
          authToken: papercutServerAuthToken,
        },
        tailscaleOauthClient,
      },
      { providers: [account.provider] },
    );

    const realtime = Realtime.getInstance({
      assumeRoleArn: account.assumeRoleArn,
    });

    const router = Router.getInstance(
      {
        domainName: ssl.domainName,
        certificateArn: ssl.certificateArn,
        keyPairId: cloudfrontPublicKey.id,
        origins: {
          api: {
            domainName: pulumi.interpolate`${gateway.id}.execute-api.${aws.getRegionOutput({}, { provider: account.provider }).name}.amazonaws.com`,
            originPath: `/${AppData.stage}`,
          },
          assets: {
            domainName: storage.buckets.assets.regionalDomainName,
          },
          documents: {
            domainName: storage.buckets.documents.regionalDomainName,
          },
          appsyncHttp: {
            domainName: realtime.httpDomainName,
          },
          appsyncRealtime: {
            domainName: realtime.realtimeDomainName,
          },
        },
      },
      { providers: [account.provider] },
    );

    const functions = Functions.getInstance({ providers: [account.provider] });

    Api.getInstance(
      {
        gateway,
        tenantId,
        domainName: ssl.domainName,
        certificateArn: ssl.certificateArn,
        cloudfrontKeyPairId: cloudfrontPublicKey.id,
        papercutSecureReverseProxyFunction: {
          invokeArn: functions.papercutSecureReverseProxy.invokeArn,
        },
        invoicesProcessorQueue: {
          arn: storage.queues.invoicesProcessor.arn,
          name: storage.queues.invoicesProcessor.name,
          url: storage.queues.invoicesProcessor.url,
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
          usersSync: {
            functionArn: pulumi.output(UsersSync.arn),
            scheduleExpression: `cron(${usersSyncSchedule})`,
            timezone,
          },
          invoicesProcessor: {
            queueArn: storage.queues.invoicesProcessor.arn,
            functionArn: pulumi.output(InvoicesProcessor.arn),
          },
        },
      },
      { providers: [account.provider] },
    );
  });
