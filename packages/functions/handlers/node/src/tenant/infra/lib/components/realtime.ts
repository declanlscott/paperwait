import { Constants } from "@paperwait/core/utils/constants";
import * as pulumi from "@pulumi/pulumi";
import { add } from "date-fns";

import * as appsync from "../dynamic/appsync";
import { useResource } from "../resource";

export interface RealtimeArgs {
  roleArn: pulumi.Input<string>;
}

export class Realtime extends pulumi.ComponentResource {
  static #instance: Realtime;

  #api: appsync.Api;
  #channelNamespace: appsync.ChannelNamespace;
  #apiKey: appsync.ApiKey;

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
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Realtime`, "Realtime", args, opts);

    this.#api = new appsync.Api(
      "Api",
      {
        eventConfig: {
          authProviders: [{ authType: "API_KEY" }, { authType: "AWS_IAM" }],
          connectionAuthModes: [{ authType: "API_KEY" }],
          defaultPublishAuthModes: [{ authType: "AWS_IAM" }],
          defaultSubscribeAuthModes: [{ authType: "API_KEY" }],
        },
        clientRoleArn: args.roleArn,
      },
      { parent: this },
    );

    this.#channelNamespace = new appsync.ChannelNamespace(
      "ChannelNamespace",
      {
        apiId: this.#api.id,
        name: "default",
        clientRoleArn: args.roleArn,
      },
      { parent: this },
    );

    this.#apiKey = new appsync.ApiKey(
      "ApiKey",
      {
        apiId: this.#api.id,
        clientRoleArn: args.roleArn,
        expires: add(
          Date.now(),
          Constants.REALTIME_API_KEY_LIFETIME,
        ).getUTCSeconds(),
      },
      { parent: this },
    );

    this.registerOutputs({
      api: this.#api.id,
      channelNamespace: this.#channelNamespace.id,
      apiKey: this.#apiKey.id,
    });
  }

  get apiId() {
    return this.#api.id;
  }

  get apiKey() {
    return this.#apiKey.id;
  }
}
