import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import * as appsync from "../dynamic/appsync";
import { useResource } from "../resource";

export interface RealtimeArgs {
  assumeRoleArn: pulumi.Input<string>;
}

export class Realtime extends pulumi.ComponentResource {
  private static _instance: Realtime;

  private _api: appsync.Api;
  private _channelNamespace: appsync.ChannelNamespace;
  private _subscriberRole: aws.iam.Role;
  private _publisherRole: aws.iam.Role;

  static getInstance(
    args: RealtimeArgs,
    opts: pulumi.ComponentResourceOptions = {},
  ): Realtime {
    if (!this._instance) this._instance = new Realtime(args, opts);

    return this._instance;
  }

  private constructor(
    ...[args, opts]: Parameters<typeof Realtime.getInstance>
  ) {
    const { AppData, Aws, Web } = useResource();

    super(`${AppData.name}:tenant:aws:Realtime`, "Realtime", args, opts);

    this._api = new appsync.Api(
      "Api",
      {
        eventConfig: {
          authProviders: [{ authType: "AWS_IAM" }],
          connectionAuthModes: [{ authType: "AWS_IAM" }],
          defaultPublishAuthModes: [{ authType: "AWS_IAM" }],
          defaultSubscribeAuthModes: [{ authType: "AWS_IAM" }],
        },
        clientRoleArn: args.assumeRoleArn,
      },
      { parent: this },
    );

    this._channelNamespace = new appsync.ChannelNamespace(
      "ChannelNamespace",
      {
        apiId: this._api.id,
        name: "default",
        clientRoleArn: args.assumeRoleArn,
      },
      { parent: this },
    );

    const assumeRolePolicy = aws.iam.getPolicyDocumentOutput(
      {
        statements: [
          {
            principals: [
              {
                type: "AWS",
                identifiers: [Web.server.role.principal],
              },
            ],
            actions: ["sts:AssumeRole"],
            conditions:
              Web.server.role.principal === "*"
                ? [
                    {
                      test: "StringLike",
                      variable: "aws:PrincipalArn",
                      values: [
                        pulumi.interpolate`arn:aws:iam::${Aws.account.id}:role/*`,
                      ],
                    },
                  ]
                : undefined,
          },
        ],
      },
      { parent: this },
    ).json;

    this._subscriberRole = new aws.iam.Role(
      "SubscriberRole",
      { name: Aws.tenant.realtimeSubscriberRole.name, assumeRolePolicy },
      { parent: this },
    );
    new aws.iam.RolePolicy(
      "SubscriberRoleInlinePolicy",
      {
        role: this._subscriberRole.name,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                actions: ["appsync:EventConnect", "appsync:EventSubscribe"],
                resources: [pulumi.interpolate`${this._api.apiArn}/*`],
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );

    this._publisherRole = new aws.iam.Role(
      "PublisherRole",
      { name: Aws.tenant.realtimeSubscriberRole.name, assumeRolePolicy },
      { parent: this },
    );
    new aws.iam.RolePolicy(
      "PublisherRoleInlinePolicy",
      {
        role: this._publisherRole.name,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                actions: ["appsync:EventPublish"],
                resources: [pulumi.interpolate`${this._api.apiArn}/*`],
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );

    this.registerOutputs({
      api: this._api.id,
      channelNamespace: this._channelNamespace.id,
      subscriberRole: this._subscriberRole.id,
      publisherRole: this._publisherRole.id,
    });
  }

  get dns() {
    return {
      http: this._api.dns.HTTP,
      realtime: this._api.dns.REALTIME,
    };
  }
}
