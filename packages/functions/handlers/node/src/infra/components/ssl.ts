import * as aws from "@pulumi/aws";
import * as cloudflare from "@pulumi/cloudflare";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

import type { Tenant } from "@paperwait/core/tenants/sql";

export interface SslArgs {
  tenantId: pulumi.Input<Tenant["id"]>;
}

export class Ssl extends pulumi.ComponentResource {
  private static instance: Ssl;

  private certificate: aws.acm.Certificate;
  private records: Array<cloudflare.Record> = [];

  public static getInstance(
    args: SslArgs,
    opts: pulumi.ComponentResourceOptions,
  ): Ssl {
    if (!this.instance) this.instance = new Ssl(args, opts);

    return this.instance;
  }

  private constructor(...[args, opts]: Parameters<typeof Ssl.getInstance>) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Ssl`, "Ssl", args, opts);

    const usEast1Provider = new aws.Provider(
      "UsEast1Provider",
      { region: "us-east-1" },
      { parent: this },
    );

    this.certificate = new aws.acm.Certificate(
      "Certificate",
      {
        domainName: pulumi.interpolate`${args.tenantId}.${AppData.domainName.fullyQualified}`,
        validationMethod: "DNS",
      },
      { provider: usEast1Provider, parent: this },
    );

    this.certificate.domainValidationOptions.apply((options) =>
      options.forEach((option, index) =>
        this.records.push(
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
      certificate: this.certificate.id,
      records: this.records.map((record) => record.id),
    });
  }

  public get domainName() {
    return this.certificate.domainName;
  }

  public get certificateArn() {
    return this.certificate.arn;
  }
}
