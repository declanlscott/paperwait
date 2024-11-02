import { Appsync, Sts } from "@paperwait/core/utils/aws";

import type * as pulumi from "@pulumi/pulumi";

type ChannelNamespaceInput = Parameters<
  typeof Appsync.createChannelNamespace
>[1];
export interface ChannelNamespaceProviderInputs extends ChannelNamespaceInput {
  clientRoleArn: string;
}

type ChannelNamespaceOutput = Required<
  NonNullable<
    Awaited<
      ReturnType<typeof Appsync.createChannelNamespace>
    >["channelNamespace"]
  >
>;
export interface ChannelNamespaceProviderOutputs
  extends ChannelNamespaceOutput {
  clientRoleArn: string;
}

export class ChannelNamespaceProvider
  implements pulumi.dynamic.ResourceProvider
{
  static #sts = new Sts.Client();

  static async #getClient(roleArn: string) {
    const { Credentials } = await Sts.assumeRole(
      ChannelNamespaceProvider.#sts,
      { RoleArn: roleArn, RoleSessionName: "ChannelNamespaceProvider" },
    );
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
  }: ChannelNamespaceProviderInputs): Promise<
    pulumi.dynamic.CreateResult<ChannelNamespaceProviderOutputs>
  > {
    const client = await ChannelNamespaceProvider.#getClient(clientRoleArn);

    const output = await Appsync.createChannelNamespace(client, input);

    const channelNamespace = output.channelNamespace as ChannelNamespaceOutput;

    return {
      id: channelNamespace.name,
      outs: { ...channelNamespace, clientRoleArn },
    };
  }

  async read(
    id: string,
    props: ChannelNamespaceProviderOutputs,
  ): Promise<pulumi.dynamic.ReadResult<ChannelNamespaceProviderOutputs>> {
    const client = await ChannelNamespaceProvider.#getClient(
      props.clientRoleArn,
    );

    const output = await Appsync.getChannelNamespace(client, {
      apiId: props.apiId,
      name: props.name,
    });

    const channelNamespace = output.channelNamespace as ChannelNamespaceOutput;

    return {
      id,
      props: { ...props, ...channelNamespace },
    };
  }

  async update(
    _name: string,
    olds: ChannelNamespaceProviderOutputs,
    { clientRoleArn, ...input }: ChannelNamespaceProviderInputs,
  ): Promise<pulumi.dynamic.UpdateResult<ChannelNamespaceProviderOutputs>> {
    const client = await ChannelNamespaceProvider.#getClient(clientRoleArn);

    const output = await Appsync.updateChannelNamespace(client, input);

    const channelNamespace = output.channelNamespace as ChannelNamespaceOutput;

    return {
      outs: { ...olds, clientRoleArn, ...channelNamespace },
    };
  }

  async delete(name: string, props: ChannelNamespaceProviderOutputs) {
    const client = await ChannelNamespaceProvider.#getClient(
      props.clientRoleArn,
    );

    await Appsync.deleteChannelNamespace(client, {
      apiId: props.apiId,
      name,
    });
  }
}
