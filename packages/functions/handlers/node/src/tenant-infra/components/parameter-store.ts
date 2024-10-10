import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { resource } from "../resource";

import type * as tls from "@pulumi/tls";

export interface ParameterStoreArgs {
  accountId: aws.organizations.Account["id"];
  cloudfrontKeyPairId: aws.cloudfront.PublicKey["id"];
  cloudfrontPrivateKey: tls.PrivateKey["privateKeyPem"];
}

export class ParameterStore extends pulumi.ComponentResource {
  private static instance: ParameterStore;

  private accountId: aws.ssm.Parameter;
  private cloudfrontKeyPairId: aws.ssm.Parameter;
  private cloudfrontPrivateKey: aws.ssm.Parameter;

  public static getInstance(
    args: ParameterStoreArgs,
    opts: pulumi.ComponentResourceOptions,
  ): ParameterStore {
    if (!this.instance) this.instance = new ParameterStore(args, opts);

    return this.instance;
  }

  private constructor(
    ...[args, opts]: Parameters<typeof ParameterStore.getInstance>
  ) {
    super(
      `${resource.AppData.name}:tenant:aws:ParameterStore`,
      "ParameterStore",
      args,
      opts,
    );

    this.accountId = new aws.ssm.Parameter("AccountId", {
      name: "/account-id",
      type: "String",
      value: args.accountId,
    });

    this.cloudfrontKeyPairId = new aws.ssm.Parameter(
      "CloudfrontKeyPairId",
      {
        name: "/paperwait/cloudfront/key-pair-id",
        type: "String",
        value: args.cloudfrontKeyPairId,
      },
      { parent: this },
    );

    this.cloudfrontPrivateKey = new aws.ssm.Parameter("CloudfrontPrivateKey", {
      name: "/paperwait/cloudfront/private-key",
      type: "SecureString",
      value: args.cloudfrontPrivateKey,
    });

    this.registerOutputs({
      accountId: this.accountId.id,
      cloudfrontKeyPairId: this.cloudfrontKeyPairId.id,
      cloudfrontPrivateKey: this.cloudfrontPrivateKey.id,
    });
  }
}
