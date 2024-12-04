import {
  CreateClusterCommand,
  DeleteClusterCommand,
  DSQLClient,
  GetClusterCommand,
  UpdateClusterCommand,
  waitUntilClusterActive,
  waitUntilClusterNotExists,
} from "@aws-sdk/client-dsql";
import { WaiterState } from "@smithy/util-waiter";

import type {
  CreateClusterCommandInput,
  CreateClusterOutput,
} from "@aws-sdk/client-dsql";

type ClusterInput = CreateClusterCommandInput;

export type ClusterProviderInputs = ClusterInput;

type ClusterOutput = {
  [TKey in keyof CreateClusterOutput]: NonNullable<CreateClusterOutput[TKey]>;
};

export type ClusterProviderOutputs = ClusterOutput;

export class ClusterProvider implements $util.dynamic.ResourceProvider {
  static #getClient = () => new DSQLClient();

  static async #untilActive(identifier: string) {
    const result = await waitUntilClusterActive(
      { client: ClusterProvider.#getClient(), maxWaitTime: 900 },
      { identifier },
    );

    if (result.state !== WaiterState.SUCCESS)
      throw new Error(
        `Unsuccessfully waited for cluster "${identifier}" to be active, result state is "${result.state}": ${JSON.stringify(result.reason)}`,
      );
  }

  static async #untilDeleted(identifier: string) {
    const result = await waitUntilClusterNotExists(
      { client: ClusterProvider.#getClient(), maxWaitTime: 900 },
      { identifier },
    );

    if (result.state !== WaiterState.SUCCESS)
      throw new Error(
        `Unsuccessfully waited for cluster "${identifier}" to be deleted, result state is "${result.state}": ${JSON.stringify(result.reason)}`,
      );
  }

  async create(
    input: ClusterInput,
  ): Promise<$util.dynamic.CreateResult<ClusterOutput>> {
    const client = ClusterProvider.#getClient();

    const output = await client.send(new CreateClusterCommand(input));

    const cluster = {
      identifier: output.identifier,
      arn: output.arn,
      status: output.status,
      creationTime: output.creationTime,
      deletionProtectionEnabled: output.deletionProtectionEnabled,
    } as ClusterOutput;

    if (Object.values(cluster).some((value) => value === undefined)) {
      console.error(output.$metadata);
      throw new Error("Failed to create cluster");
    }

    await ClusterProvider.#untilActive(cluster.identifier);

    return {
      id: output.identifier!,
      outs: cluster,
    };
  }

  async read(
    id: string,
    props: ClusterProviderOutputs,
  ): Promise<$util.dynamic.ReadResult<ClusterProviderOutputs>> {
    const client = ClusterProvider.#getClient();

    const output = await client.send(
      new GetClusterCommand({
        identifier: id,
      }),
    );

    const cluster = {
      identifier: output.identifier,
      arn: output.arn,
      creationTime: output.creationTime,
      deletionProtectionEnabled: output.deletionProtectionEnabled,
    } as ClusterOutput;

    if (Object.values(cluster).some((value) => value === undefined)) {
      console.error(output.$metadata);
      throw new Error("Failed to read cluster");
    }

    return {
      id,
      props: {
        ...props,
        ...{
          identifier: output.identifier!,
          arn: output.arn!,
          creationTime: output.creationTime!,
          deletionProtectionEnabled: output.deletionProtectionEnabled!,
        },
      },
    };
  }

  async update(
    id: string,
    olds: ClusterProviderOutputs,
    input: ClusterProviderInputs,
  ): Promise<$util.dynamic.UpdateResult<ClusterProviderOutputs>> {
    const client = ClusterProvider.#getClient();

    const output = await client.send(
      new UpdateClusterCommand({ identifier: id, ...input }),
    );

    const cluster = {
      identifier: output.identifier,
      arn: output.arn,
      creationTime: output.creationTime,
      deletionProtectionEnabled: output.deletionProtectionEnabled,
    } as ClusterOutput;

    if (Object.values(cluster).some((value) => value === undefined)) {
      console.error(output.$metadata);
      throw new Error("Failed to update cluster");
    }

    await ClusterProvider.#untilActive(cluster.identifier);

    return {
      outs: {
        ...olds,
        ...{
          identifier: output.identifier!,
          arn: output.arn!,
          creationTime: output.creationTime!,
          deletionProtectionEnabled: output.deletionProtectionEnabled!,
        },
      },
    };
  }

  async delete(id: string) {
    const client = ClusterProvider.#getClient();

    await client.send(new DeleteClusterCommand({ identifier: id }));

    await ClusterProvider.#untilDeleted(id);
  }
}
