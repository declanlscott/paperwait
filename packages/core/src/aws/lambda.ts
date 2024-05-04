import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

import { AWS_REGION } from "../constants";

import type { InvokeCommandInput } from "@aws-sdk/client-lambda";

export const lambdaClient = new LambdaClient({ region: AWS_REGION });

export async function invokeLambda(input: InvokeCommandInput) {
  return await lambdaClient.send(new InvokeCommand(input));
}
