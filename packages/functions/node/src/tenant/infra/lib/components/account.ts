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
  #budget: aws.budgets.Budget;

  static getInstance(
    args: AccountArgs,
    opts: pulumi.ComponentResourceOptions = {},
  ): Account {
    if (!this.#instance) this.#instance = new Account(args, opts);

    return this.#instance;
  }

  private constructor(...[args, opts]: Parameters<typeof Account.getInstance>) {
    const { AppData, Aws } = useResource();

    super(`${AppData.name}:tenant:aws:Account`, "Account", args, opts);

    const name = pulumi.interpolate`${AppData.name}-${AppData.stage}-tenant-${args.tenantId}`;

    const emailSegments = Aws.organization.email.split("@");
    const email = pulumi.interpolate`${emailSegments[0]}+${name}@${emailSegments[1]}`;

    this.#account = new aws.organizations.Account(
      "Account",
      {
        name,
        email,
        parentId: Aws.organization.tenantsOrganizationalUnit.id,
        roleName: Aws.tenant.accountAccessRole.name,
        iamUserAccessToBilling: "ALLOW",
      },
      { parent: this },
    );

    this.#assumeRoleArn = pulumi.interpolate`arn:aws:iam::${this.#account.id}:role/${this.#account.roleName}`;

    this.#provider = new aws.Provider(
      "Provider",
      {
        region: Aws.region as aws.Region,
        assumeRole: { roleArn: this.#assumeRoleArn },
      },
      { parent: this },
    );

    this.#budget = new aws.budgets.Budget(
      "Budget",
      {
        budgetType: "COST",
        limitAmount: "1",
        limitUnit: "USD",
        timeUnit: "MONTHLY",
        notifications: [
          {
            comparisonOperator: "GREATER_THAN",
            threshold: 100,
            thresholdType: "PERCENTAGE",
            notificationType: "FORECASTED",
            subscriberEmailAddresses: [email],
          },
        ],
      },
      { parent: this },
    );

    this.registerOutputs({
      account: this.#account.id,
      provider: this.#provider.id,
      budget: this.#budget.id,
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
