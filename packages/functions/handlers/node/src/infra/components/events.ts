import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

export interface EventsArgs {
  userSync: {
    functionArn: aws.lambda.Function["arn"];
    scheduleExpression: pulumi.Input<string>;
    timezone: pulumi.Input<string>;
  };
  tailscaleAuthKeyRotation: {
    functionArn: aws.lambda.Function["arn"];
  };
}

export class Events extends pulumi.ComponentResource {
  private static instance: Events;

  private events: Array<ScheduledEvent | PatternedEvent> = [];

  public static getInstance(
    args: EventsArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    if (!this.instance) this.instance = new Events(args, opts);

    return this.instance;
  }

  private constructor(...[args, opts]: Parameters<typeof Events.getInstance>) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Events`, "Events", args, opts);

    this.events.push(
      new ScheduledEvent(
        "ScheduledUserSync",
        {
          functionArn: args.userSync.functionArn,
          scheduleExpression: args.userSync.scheduleExpression,
          flexibleTimeWindow: {
            mode: "FLEXIBLE",
            maximumWindowInMinutes: 15,
          },
          timezone: args.userSync.timezone,
        },
        { parent: this },
      ),
    );

    this.events.push(
      new ScheduledEvent(
        "ScheduledTailscaleAuthKeyRotation",
        {
          functionArn: args.tailscaleAuthKeyRotation.functionArn,
          scheduleExpression: "rate(60 days)",
          flexibleTimeWindow: {
            mode: "OFF",
          },
        },
        { parent: this },
      ),
    );
  }
}

interface ScheduledEventArgs {
  functionArn: aws.lambda.Function["arn"];
  scheduleExpression: pulumi.Input<string>;
  flexibleTimeWindow: aws.types.input.scheduler.ScheduleFlexibleTimeWindow;
  timezone?: pulumi.Input<string>;
}

class ScheduledEvent extends pulumi.ComponentResource {
  private role: aws.iam.Role;
  private schedule: aws.scheduler.Schedule;

  public constructor(
    name: string,
    args: ScheduledEventArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:ScheduledEvent`, name, args, opts);

    this.role = new aws.iam.Role(
      `${name}Role`,
      {
        assumeRolePolicy: aws.iam.getPolicyDocumentOutput({
          statements: [
            {
              actions: ["sts:AssumeRole"],
              principals: [
                {
                  type: "Service",
                  identifiers: ["scheduler.amazonaws.com"],
                },
              ],
            },
          ],
        }).json,
      },
      { parent: this },
    );

    new aws.iam.RolePolicy(
      `${name}InlinePolicy`,
      {
        role: this.role,
        policy: aws.iam.getPolicyDocumentOutput({
          statements: [
            {
              actions: ["lambda:InvokeFunction"],
              resources: [args.functionArn],
            },
          ],
        }).json,
      },
      { parent: this },
    );

    this.schedule = new aws.scheduler.Schedule(
      `${name}Schedule`,
      {
        target: {
          arn: args.functionArn,
          roleArn: this.role.arn,
        },
        scheduleExpression: args.scheduleExpression,
        flexibleTimeWindow: args.flexibleTimeWindow,
        scheduleExpressionTimezone: args.timezone ?? "UTC",
      },
      { parent: this },
    );

    this.registerOutputs({
      role: this.role.id,
      schedule: this.schedule.id,
    });
  }
}

interface PatternedEventArgs {
  functionArn: pulumi.Input<string>;
  pattern: pulumi.Input<string>;
}

class PatternedEvent extends pulumi.ComponentResource {
  private rule: aws.cloudwatch.EventRule;
  private target: aws.cloudwatch.EventTarget;
  private permission: aws.lambda.Permission;

  public constructor(
    name: string,
    args: PatternedEventArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:PatternedEvent`, name, args, opts);

    this.rule = new aws.cloudwatch.EventRule(
      `${name}Rule`,
      { eventPattern: args.pattern },
      { parent: this },
    );

    this.target = new aws.cloudwatch.EventTarget(
      `${name}Target`,
      {
        arn: args.functionArn,
        rule: this.rule.name,
      },
      { parent: this },
    );

    this.permission = new aws.lambda.Permission(
      `${name}Permission`,
      {
        action: "lambda:InvokeFunction",
        function: args.functionArn,
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
