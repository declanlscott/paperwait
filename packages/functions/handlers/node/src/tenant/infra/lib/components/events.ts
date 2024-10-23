import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

export interface EventsArgs {
  tenantId: pulumi.Input<string>;
  events: {
    tailscaleAuthKeyRotation: {
      functionArn: aws.lambda.Function["arn"];
    };
    userSync: {
      functionArn: aws.lambda.Function["arn"];
      scheduleExpression: pulumi.Input<string>;
      timezone: pulumi.Input<string>;
    };
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
        "ScheduledTailscaleAuthKeyRotation",
        {
          scheduleExpression: "rate(60 days)",
          flexibleTimeWindow: {
            mode: "OFF",
          },
          functionTarget: {
            arn: args.events.tailscaleAuthKeyRotation.functionArn,
          },
        },
        { parent: this },
      ),
    );

    this.events.push(
      new PatternedEvent(
        "PatternedTailscaleAuthKeyRotation",
        {
          pattern: pulumi.jsonStringify({
            "detail-type": ["tailscale-auth-key-rotation"],
          }),
          functionTarget: {
            arn: args.events.tailscaleAuthKeyRotation.functionArn,
            createPermission: true,
          },
        },
        { parent: this },
      ),
    );

    this.events.push(
      new ScheduledEvent(
        "ScheduledUserSync",
        {
          scheduleExpression: args.events.userSync.scheduleExpression,
          flexibleTimeWindow: {
            mode: "FLEXIBLE",
            maximumWindowInMinutes: 15,
          },
          timezone: args.events.userSync.timezone,
          functionTarget: {
            arn: args.events.userSync.functionArn,
            input: pulumi.jsonStringify({ tenantId: args.tenantId }),
          },
        },
        { parent: this },
      ),
    );

    this.events.push(
      new PatternedEvent(
        "PatternedUserSync",
        {
          pattern: pulumi.jsonStringify({
            "detail-type": ["user-sync"],
          }),
          functionTarget: {
            arn: args.events.userSync.functionArn,
            input: pulumi.jsonStringify({ tenantId: args.tenantId }),
            createPermission: false,
          },
        },
        { parent: this },
      ),
    );
  }
}

interface ScheduledEventArgs {
  scheduleExpression: pulumi.Input<string>;
  flexibleTimeWindow: aws.types.input.scheduler.ScheduleFlexibleTimeWindow;
  timezone?: pulumi.Input<string>;
  functionTarget: {
    arn: aws.lambda.Function["arn"];
    input?: pulumi.Input<string>;
  };
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
        role: this.role.name,
        policy: aws.iam.getPolicyDocumentOutput({
          statements: [
            {
              actions: ["lambda:InvokeFunction"],
              resources: [args.functionTarget.arn],
            },
          ],
        }).json,
      },
      { parent: this },
    );

    this.schedule = new aws.scheduler.Schedule(
      `${name}Schedule`,
      {
        scheduleExpression: args.scheduleExpression,
        flexibleTimeWindow: args.flexibleTimeWindow,
        scheduleExpressionTimezone: args.timezone ?? "UTC",
        target: {
          arn: args.functionTarget.arn,
          roleArn: this.role.arn,
          input: args.functionTarget.input,
        },
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
  pattern: pulumi.Input<string>;
  functionTarget: {
    arn: aws.lambda.Function["arn"];
    input?: pulumi.Input<string>;
    createPermission: boolean;
  };
}

class PatternedEvent extends pulumi.ComponentResource {
  private rule: aws.cloudwatch.EventRule;
  private target: aws.cloudwatch.EventTarget;
  private permission?: aws.lambda.Permission;

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
        arn: args.functionTarget.arn,
        rule: this.rule.name,
      },
      { parent: this },
    );

    if (args.functionTarget.createPermission)
      this.permission = new aws.lambda.Permission(
        `${name}Permission`,
        {
          action: "lambda:InvokeFunction",
          function: args.functionTarget.arn,
          principal: "events.amazonaws.com",
          sourceArn: this.rule.arn,
        },
        { parent: this },
      );

    this.registerOutputs({
      rule: this.rule.id,
      target: this.target.id,
      permission: this.permission?.id,
    });
  }
}
