import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

export interface AccountArgs {
  tenantId: pulumi.Input<string>;
}

export class Account extends pulumi.ComponentResource {
  static #instance: Account;

  #account: aws.organizations.Account;
  #assumeRoleArn: pulumi.Output<string>;
  #provider: aws.Provider;

  static getInstance(
    args: AccountArgs,
    opts: pulumi.ComponentResourceOptions = {},
  ): Account {
    if (!this.#instance) this.#instance = new Account(args, opts);

    return this.#instance;
  }

  private constructor(...[args, opts]: Parameters<typeof Account.getInstance>) {
    const { AppData, Cloud } = useResource();

    super(`${AppData.name}:tenant:aws:Account`, "Account", args, opts);

    const accountName = pulumi.interpolate`${AppData.name}-${AppData.stage}-tenant-${args.tenantId}`;

    const emailSegments = Cloud.aws.organization.email.split("@");

    this.#account = new aws.organizations.Account(
      "Account",
      {
        name: accountName,
        email: pulumi.interpolate`${emailSegments[0]}+${accountName}@${emailSegments[1]}`,
        parentId: Cloud.aws.organization.tenantsOrganizationalUnit.id,
        roleName: Cloud.aws.tenant.accountAccessRole.name,
        iamUserAccessToBilling: "ALLOW",
      },
      { parent: this },
    );

    this.#assumeRoleArn = pulumi.interpolate`arn:aws:iam::${this.#account.id}:role/${this.#account.roleName}`;

    this.#provider = new aws.Provider(
      "Provider",
      {
        region: Cloud.aws.region as aws.Region,
        assumeRole: { roleArn: this.#assumeRoleArn },
      },
      { parent: this },
    );

    this.registerOutputs({
      account: this.#account.id,
      provider: this.#provider.id,
    });
  }

  get id() {
    return this.#account.id;
  }

  get assumeRoleArn() {
    return this.#assumeRoleArn;
  }

  get provider() {
    return this.#provider;
  }
}
