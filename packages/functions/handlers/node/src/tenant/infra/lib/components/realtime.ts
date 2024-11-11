import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import * as appsync from "../dynamic/appsync";
import { useResource } from "../resource";

export interface RealtimeArgs {
  assumeRoleArn: pulumi.Input<string>;
}

export class Realtime extends pulumi.ComponentResource {
  static #instance: Realtime;

  #api: appsync.Api;
  #channelNamespace: appsync.ChannelNamespace;
  #subscriberRole: aws.iam.Role;
  #publisherRole: aws.iam.Role;

  static getInstance(
    args: RealtimeArgs,
    opts: pulumi.ComponentResourceOptions = {},
  ): Realtime {
    if (!this.#instance) this.#instance = new Realtime(args, opts);

    return this.#instance;
  }

  private constructor(
    ...[args, opts]: Parameters<typeof Realtime.getInstance>
  ) {
    const { AppData, Aws, Web } = useResource();

    super(`${AppData.name}:tenant:aws:Realtime`, "Realtime", args, opts);

    this.#api = new appsync.Api(
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

    this.#channelNamespace = new appsync.ChannelNamespace(
      "ChannelNamespace",
      {
        apiId: this.#api.id,
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

    this.#subscriberRole = new aws.iam.Role(
      "SubscriberRole",
      { name: Aws.tenant.realtimeSubscriberRole.name, assumeRolePolicy },
      { parent: this },
    );
    new aws.iam.RolePolicy(
      "SubscriberRoleInlinePolicy",
      {
        role: this.#subscriberRole.name,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                actions: ["appsync:EventConnect", "appsync:EventSubscribe"],
                resources: [this.#api.apiArn],
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );

    this.#publisherRole = new aws.iam.Role(
      "PublisherRole",
      { name: Aws.tenant.realtimeSubscriberRole.name, assumeRolePolicy },
      { parent: this },
    );
    new aws.iam.RolePolicy(
      "PublisherRoleInlinePolicy",
      {
        role: this.#publisherRole.name,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                actions: ["appsync:EventPublish"],
                resources: [this.#api.apiArn],
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );

    this.registerOutputs({
      api: this.#api.id,
      channelNamespace: this.#channelNamespace.id,
    });
  }

  get httpDomainName() {
    return pulumi.interpolate`${this.#api.apiId}.appsync-api.${aws.getRegionOutput({}, { parent: this }).name}.amazonaws.com`;
  }

  get realtimeDomainName() {
    return pulumi.interpolate`${this.#api.apiId}.appsync-realtime-api.${aws.getRegionOutput({}, { parent: this }).name}.amazonaws.com`;
  }
}
