import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

export interface CronArgs {
  tailscaleAuthKeyRotationFunctionArn: aws.lambda.Function["arn"];
}

export class Cron extends pulumi.ComponentResource {
  private static instance: Cron;

  private jobs: Array<CronJob> = [];

  public static getInstance(
    args: CronArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    if (!this.instance) this.instance = new Cron(args, opts);

    return this.instance;
  }

  private constructor(...[args, opts]: Parameters<typeof Cron.getInstance>) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Cron`, "Cron", args, opts);

    this.jobs.push(
      new CronJob(
        "TailscaleAuthKeyRotation",
        {
          target: args.tailscaleAuthKeyRotationFunctionArn,
          scheduleExpression: "rate(60 days)",
        },
        { parent: this },
      ),
    );
  }
}

interface CronJobArgs {
  target: pulumi.Input<string>;
  scheduleExpression: pulumi.Input<string>;
}

class CronJob extends pulumi.ComponentResource {
  private rule: aws.cloudwatch.EventRule;
  private target: aws.cloudwatch.EventTarget;
  private permission: aws.lambda.Permission;

  public constructor(
    name: string,
    args: CronJobArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:CronJob`, name, args, opts);

    this.rule = new aws.cloudwatch.EventRule(
      `${name}Rule`,
      { scheduleExpression: args.scheduleExpression },
      { parent: this },
    );

    this.target = new aws.cloudwatch.EventTarget(
      `${name}Target`,
      {
        arn: args.target,
        rule: this.rule.name,
      },
      { parent: this },
    );

    this.permission = new aws.lambda.Permission(
      `${name}Permission`,
      {
        action: "lambda:InvokeFunction",
        function: args.target,
        principal: "events.amazonaws.com",
        sourceArn: this.rule.arn,
      },
      { parent: this },
    );

    this.registerOutputs({
      rule: this.rule.id,
      target: this.target.id,
      permission: this.permission.id,
    });
  }
}
