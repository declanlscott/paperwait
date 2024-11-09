import { Utils } from "@printworks/core/utils";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { useResource } from "../resource";

export interface EventsArgs {
  tenantId: pulumi.Input<string>;
  domainName: aws.acm.Certificate["domainName"];
  events: {
    tailscaleAuthKeyRotation: {
      functionArn: aws.lambda.Function["arn"];
    };
    usersSync: {
      functionArn: aws.lambda.Function["arn"];
      scheduleExpression: pulumi.Input<string>;
      timezone: pulumi.Input<string>;
    };
    invoicesProcessor: {
      queueArn: aws.sqs.Queue["arn"];
      functionArn: aws.lambda.Function["arn"];
    };
  };
}

export class Events extends pulumi.ComponentResource {
  static #instance: Events;

  #events: Array<ScheduledEvent | PatternedEvent> = [];
  #invoicesProcessorPipeRole: aws.iam.Role;
  #invoicesProcessorPipe: aws.pipes.Pipe;

  static getInstance(args: EventsArgs, opts: pulumi.ComponentResourceOptions) {
    if (!this.#instance) this.#instance = new Events(args, opts);

    return this.#instance;
  }

  private constructor(...[args, opts]: Parameters<typeof Events.getInstance>) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:Events`, "Events", args, opts);

    this.#events.push(
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

    this.#events.push(
      new PatternedEvent(
        "PatternedTailscaleAuthKeyRotation",
        {
          pattern: pulumi.jsonStringify({
            "detail-type": ["TailscaleAuthKeyRotation"],
            source: args.domainName.apply((domainName) =>
              Utils.reverseDns(domainName),
            ),
          }),
          functionTarget: {
            arn: args.events.tailscaleAuthKeyRotation.functionArn,
            createPermission: true,
          },
        },
        { parent: this },
      ),
    );

    this.#events.push(
      new ScheduledEvent(
        "ScheduledUsersSync",
        {
          scheduleExpression: args.events.usersSync.scheduleExpression,
          flexibleTimeWindow: {
            mode: "FLEXIBLE",
            maximumWindowInMinutes: 15,
          },
          timezone: args.events.usersSync.timezone,
          functionTarget: {
            arn: args.events.usersSync.functionArn,
            input: pulumi.jsonStringify({ tenantId: args.tenantId }),
          },
        },
        { parent: this },
      ),
    );

    this.#events.push(
      new PatternedEvent(
        "PatternedUsersSync",
        {
          pattern: pulumi.jsonStringify({
            "detail-type": ["UsersSync"],
            source: args.domainName.apply((domainName) =>
              Utils.reverseDns(domainName),
            ),
          }),
          functionTarget: {
            arn: args.events.usersSync.functionArn,
            createPermission: false,
          },
        },
        { parent: this },
      ),
    );

    this.#invoicesProcessorPipeRole = new aws.iam.Role(
      "InvoicesProcessorPipeRole",
      {
        assumeRolePolicy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                actions: ["sts:AssumeRole"],
                principals: [
                  {
                    type: "Service",
                    identifiers: ["pipes.amazonaws.com"],
                  },
                ],
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );
    new aws.iam.RolePolicy(
      "InvoicesProcessorPipeInlinePolicy",
      {
        role: this.#invoicesProcessorPipeRole.name,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                actions: [
                  "sqs:ReceiveMessage",
                  "sqs:DeleteMessage",
                  "sqs:GetQueueAttributes",
                ],
                resources: [args.events.invoicesProcessor.queueArn],
              },
              {
                actions: ["events:PutEvents"],
                resources: [
                  aws.cloudwatch.getEventBusOutput(
                    { name: "default" },
                    { parent: this },
                  ).arn,
                ],
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );

    this.#invoicesProcessorPipe = new aws.pipes.Pipe(
      "InvoicesProcessorPipe",
      {
        roleArn: this.#invoicesProcessorPipeRole.arn,
        source: args.events.invoicesProcessor.queueArn,
        sourceParameters: {
          sqsQueueParameters: {
            batchSize: 10,
            maximumBatchingWindowInSeconds: 60,
          },
        },
        target: args.events.invoicesProcessor.functionArn,
        targetParameters: {
          eventbridgeEventBusParameters: {
            detailType: "InvoicesProcessor",
            source: args.events.invoicesProcessor.queueArn,
          },
        },
      },
      { parent: this },
    );

    this.#events.push(
      new PatternedEvent(
        "PatternedInvoicesProcessor",
        {
          pattern: pulumi.jsonStringify({
            "detail-type": ["InvoicesProcessor"],
            source: [args.events.invoicesProcessor.queueArn],
          }),
          functionTarget: {
            arn: args.events.invoicesProcessor.functionArn,
            createPermission: false,
          },
          withDeadLetterQueue: true,
        },
        { parent: this },
      ),
    );

    this.registerOutputs({
      invoicesProcessorPipeRole: this.#invoicesProcessorPipeRole.id,
      invoicesProcessorPipe: this.#invoicesProcessorPipe.id,
    });
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
  #role: aws.iam.Role;
  #schedule: aws.scheduler.Schedule;

  constructor(
    name: string,
    args: ScheduledEventArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:ScheduledEvent`, name, args, opts);

    this.#role = new aws.iam.Role(
      `${name}Role`,
      {
        assumeRolePolicy: aws.iam.getPolicyDocumentOutput(
          {
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
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );

    new aws.iam.RolePolicy(
      `${name}InlinePolicy`,
      {
        role: this.#role.name,
        policy: aws.iam.getPolicyDocumentOutput(
          {
            statements: [
              {
                actions: ["lambda:InvokeFunction"],
                resources: [args.functionTarget.arn],
              },
            ],
          },
          { parent: this },
        ).json,
      },
      { parent: this },
    );

    this.#schedule = new aws.scheduler.Schedule(
      `${name}Schedule`,
      {
        scheduleExpression: args.scheduleExpression,
        flexibleTimeWindow: args.flexibleTimeWindow,
        scheduleExpressionTimezone: args.timezone ?? "UTC",
        target: {
          arn: args.functionTarget.arn,
          roleArn: this.#role.arn,
          input: args.functionTarget.input,
        },
      },
      { parent: this },
    );

    this.registerOutputs({
      role: this.#role.id,
      schedule: this.#schedule.id,
    });
  }
}

interface PatternedEventArgs {
  pattern: pulumi.Input<string>;
  functionTarget: {
    arn: aws.lambda.Function["arn"];
    createPermission: boolean;
  };
  withDeadLetterQueue?: boolean;
}

class PatternedEvent extends pulumi.ComponentResource {
  #rule: aws.cloudwatch.EventRule;
  #deadLetterQueue?: aws.sqs.Queue;
  #target: aws.cloudwatch.EventTarget;
  #permission?: aws.lambda.Permission;

  constructor(
    name: string,
    args: PatternedEventArgs,
    opts: pulumi.ComponentResourceOptions,
  ) {
    const { AppData } = useResource();

    super(`${AppData.name}:tenant:aws:PatternedEvent`, name, args, opts);

    this.#rule = new aws.cloudwatch.EventRule(
      `${name}Rule`,
      { eventPattern: args.pattern },
      { parent: this },
    );

    if (args.withDeadLetterQueue)
      this.#deadLetterQueue = new aws.sqs.Queue(
        "DeadLetterQueue",
        {
          messageRetentionSeconds: 1209600, // 14 days
        },
        { parent: this },
      );

    this.#target = new aws.cloudwatch.EventTarget(
      `${name}Target`,
      {
        arn: args.functionTarget.arn,
        rule: this.#rule.name,
        deadLetterConfig:
          args.withDeadLetterQueue && this.#deadLetterQueue
            ? { arn: this.#deadLetterQueue.arn }
            : undefined,
      },
      { parent: this },
    );

    if (args.functionTarget.createPermission)
      this.#permission = new aws.lambda.Permission(
        `${name}Permission`,
        {
          action: "lambda:InvokeFunction",
          function: args.functionTarget.arn,
          principal: "events.amazonaws.com",
          sourceArn: this.#rule.arn,
        },
        { parent: this },
      );

    this.registerOutputs({
      rule: this.#rule.id,
      target: this.#target.id,
      permission: this.#permission?.id,
    });
  }
}
