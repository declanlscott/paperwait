import { Appsync, Sts } from "@paperwait/core/utils/aws";

import type * as pulumi from "@pulumi/pulumi";

type ApiKeyInput = Parameters<typeof Appsync.createApiKey>[1];
export interface ApiKeyProviderInputs extends ApiKeyInput {
  clientRoleArn: string;
}

type ApiKeyOutput = Required<
  NonNullable<Awaited<ReturnType<typeof Appsync.createApiKey>>["apiKey"]>
>;
export interface ApiKeyProviderOutputs extends ApiKeyOutput {
  apiId: string;
  clientRoleArn: string;
}

export class ApiKeyProvider implements pulumi.dynamic.ResourceProvider {
  static #sts = new Sts.Client();

  static async #getClient(roleArn: string) {
    const { Credentials } = await Sts.assumeRole(ApiKeyProvider.#sts, {
      RoleArn: roleArn,
      RoleSessionName: "ApiKeyProvider",
    });
    if (!Credentials?.AccessKeyId || !Credentials.SecretAccessKey)
      throw new Error("Missing credentials");

    return new Appsync.Client({
      credentials: {
        accessKeyId: Credentials.AccessKeyId,
        secretAccessKey: Credentials.SecretAccessKey,
        sessionToken: Credentials.SessionToken,
        expiration: Credentials.Expiration,
      },
    });
  }

  async create({
    clientRoleArn,
    ...input
  }: ApiKeyProviderInputs): Promise<
    pulumi.dynamic.CreateResult<ApiKeyProviderOutputs>
  > {
    const client = await ApiKeyProvider.#getClient(clientRoleArn);

    const output = await Appsync.createApiKey(client, input);

    const apiKey = output.apiKey as ApiKeyOutput;

    return {
      id: apiKey.id,
      outs: { ...apiKey, apiId: input.apiId, clientRoleArn },
    };
  }

  async update(
    id: string,
    olds: ApiKeyProviderOutputs,
    { clientRoleArn, ...input }: ApiKeyProviderInputs,
  ): Promise<pulumi.dynamic.UpdateResult<ApiKeyProviderOutputs>> {
    const client = await ApiKeyProvider.#getClient(clientRoleArn);

    const output = await Appsync.updateApiKey(client, {
      id,
      ...input,
    });

    const apiKey = output.apiKey as ApiKeyOutput;

    return {
      outs: { ...olds, clientRoleArn, ...apiKey },
    };
  }

  async delete(id: string, props: ApiKeyProviderOutputs) {
    const client = await ApiKeyProvider.#getClient(props.clientRoleArn);

    await Appsync.deleteApiKey(client, { apiId: props.apiId, id });
  }
}
