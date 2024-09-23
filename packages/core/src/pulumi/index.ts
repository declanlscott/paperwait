import type {
  DestroyOptions,
  Stack,
  UpOptions,
} from "@pulumi/pulumi/automation";

export * as Automation from "@pulumi/pulumi/automation";

export { version as awsPluginVersion } from "@pulumi/aws/package.json";

export const up = async (stack: Stack, options?: UpOptions) =>
  stack.up({ ...options, onEvent: console.log, onOutput: console.log });

export const destroy = async (stack: Stack, options?: DestroyOptions) =>
  stack.destroy({ ...options, onEvent: console.log, onOutput: console.log });
