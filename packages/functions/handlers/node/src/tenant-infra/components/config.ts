import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

import type * as tls from "@pulumi/tls";

export interface ConfigArgs {
  cloudfrontKeyPairId: aws.cloudfront.PublicKey["id"];
  cloudfrontPrivateKey: tls.PrivateKey["privateKeyPem"];
}

export class Config extends pulumi.ComponentResource {
  private static instance: Config;

  private cloudfrontKeyPairId: aws.ssm.Parameter;
  private cloudfrontPrivateKey: aws.ssm.Parameter;

  public static getInstance(
    args: ConfigArgs,
    opts: pulumi.ComponentResourceOptions,
  ): Config {
    if (!this.instance) this.instance = new Config(args, opts);

    return this.instance;
  }

  private constructor(...[args, opts]: Parameters<typeof Config.getInstance>) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Config`, "Config", args, opts);

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
      cloudfrontKeyPairId: this.cloudfrontKeyPairId.id,
      cloudfrontPrivateKey: this.cloudfrontPrivateKey.id,
    });
  }
}
