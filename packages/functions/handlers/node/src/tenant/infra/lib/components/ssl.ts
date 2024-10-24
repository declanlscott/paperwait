import * as aws from "@pulumi/aws";
import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

export interface SslArgs {
  tenantId: pulumi.Input<string>;
}

export class Ssl extends pulumi.ComponentResource {
  static #instance: Ssl;

  #certificate: aws.acm.Certificate;
  #records: Array<cloudflare.Record> = [];

  static getInstance(
    args: SslArgs,
    opts: pulumi.ComponentResourceOptions,
  ): Ssl {
    if (!this.#instance) this.#instance = new Ssl(args, opts);

    return this.#instance;
  }

  private constructor(...[args, opts]: Parameters<typeof Ssl.getInstance>) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Ssl`, "Ssl", args, opts);

    const usEast1Provider = new aws.Provider(
      "UsEast1Provider",
      { region: "us-east-1" },
      { parent: this },
    );

    this.#certificate = new aws.acm.Certificate(
      "Certificate",
      {
        domainName: pulumi.interpolate`${args.tenantId}.${AppData.domainName.fullyQualified}`,
        validationMethod: "DNS",
      },
      { provider: usEast1Provider, parent: this },
    );

    this.#certificate.domainValidationOptions.apply((options) =>
      options.forEach((option, index) =>
        this.#records.push(
          new cloudflare.Record(
            `CertificateValidationRecord${index}`,
            {
              zoneId: cloudflare.getZoneOutput({
                name: AppData.domainName.value,
              }).id,
              type: option.resourceRecordType,
              name: option.resourceRecordName,
              value: option.resourceRecordValue,
            },
            { parent: this },
          ),
        ),
      ),
    );

    this.registerOutputs({
      certificate: this.#certificate.id,
      records: this.#records.map((record) => record.id),
    });
  }

  get domainName() {
    return this.#certificate.domainName;
  }

  get certificateArn() {
    return this.#certificate.arn;
  }
}
