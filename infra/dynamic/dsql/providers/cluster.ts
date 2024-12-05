import type {
  CreateClusterCommandInput,
  CreateClusterOutput,
} from "@aws-sdk/client-dsql";

type ClusterInput = CreateClusterCommandInput;

export type ClusterProviderInputs = ClusterInput;

type ClusterOutput = {
  [TKey in keyof Omit<CreateClusterOutput, "creationTime">]: NonNullable<
    CreateClusterOutput[TKey]
  >;
} & {
  creationTime: string;
};

export interface ClusterProviderOutputs extends ClusterOutput {
  tags: ClusterInput["tags"];
}

export class ClusterProvider implements $util.dynamic.ResourceProvider {
  private static _getSdk = async () => import("@aws-sdk/client-dsql");

  private static _getClient = async () =>
    ClusterProvider._getSdk().then((sdk) => new sdk.DSQLClient());

  private static async _untilActive(identifier: string) {
    const result = await ClusterProvider._getSdk().then(async (sdk) =>
      sdk.waitUntilClusterActive(
        {
          client: await ClusterProvider._getClient(),
          maxWaitTime: 900,
        },
        { identifier },
      ),
    );

    if (result.state !== "SUCCESS")
      throw new Error(
        `Unsuccessfully waited for cluster "${identifier}" to be active, result state is "${result.state}": ${JSON.stringify(result.reason)}`,
      );
  }

  private static async _untilDeleted(identifier: string) {
    const result = await ClusterProvider._getSdk().then(async (sdk) =>
      sdk.waitUntilClusterNotExists(
        {
          client: await ClusterProvider._getClient(),
          maxWaitTime: 900,
        },
        { identifier },
      ),
    );

    if (result.state !== "SUCCESS")
      throw new Error(
        `Unsuccessfully waited for cluster "${identifier}" to be deleted, result state is "${result.state}": ${JSON.stringify(result.reason)}`,
      );
  }

  private static _isValidOutput(
    output: Partial<ClusterOutput>,
    metadata: unknown,
  ): output is ClusterOutput {
    const isValid = Object.values(output).every((value) => value !== undefined);

    if (!isValid) console.error(metadata);

    return isValid;
  }

  async create(
    input: ClusterInput,
  ): Promise<$util.dynamic.CreateResult<ClusterProviderOutputs>> {
    const client = await ClusterProvider._getClient();

    const output = await client.send(
      await ClusterProvider._getSdk().then(
        (sdk) => new sdk.CreateClusterCommand(input),
      ),
    );

    const cluster = {
      identifier: output.identifier,
      arn: output.arn,
      status: output.status,
      creationTime: output.creationTime?.toISOString(),
      deletionProtectionEnabled: output.deletionProtectionEnabled,
    };

    if (!ClusterProvider._isValidOutput(cluster, output.$metadata))
      throw new Error("Failed to create cluster");

    await ClusterProvider._untilActive(cluster.identifier);

    return {
      id: cluster.identifier,
      outs: { ...cluster, tags: input.tags },
    };
  }

  async read(
    id: string,
    props: ClusterProviderOutputs,
  ): Promise<$util.dynamic.ReadResult<ClusterProviderOutputs>> {
    const client = await ClusterProvider._getClient();

    const output = await client.send(
      await ClusterProvider._getSdk().then(
        (sdk) => new sdk.GetClusterCommand({ identifier: id }),
      ),
    );

    const cluster = {
      identifier: output.identifier,
      arn: output.arn,
      status: output.status,
      creationTime: output.creationTime?.toISOString(),
      deletionProtectionEnabled: output.deletionProtectionEnabled,
    };

    if (!ClusterProvider._isValidOutput(cluster, output.$metadata))
      throw new Error("Failed to read cluster");

    return {
      id,
      props: {
        ...props,
        ...cluster,
      },
    };
  }

  async update(
    id: string,
    olds: ClusterProviderOutputs,
    input: ClusterProviderInputs,
  ): Promise<$util.dynamic.UpdateResult<ClusterProviderOutputs>> {
    const client = await ClusterProvider._getClient();

    const output = await client.send(
      await ClusterProvider._getSdk().then(
        (sdk) => new sdk.UpdateClusterCommand({ identifier: id, ...input }),
      ),
    );

    const cluster = {
      identifier: output.identifier,
      arn: output.arn,
      status: output.status,
      creationTime: output.creationTime?.toISOString(),
      deletionProtectionEnabled: output.deletionProtectionEnabled,
    };

    if (!ClusterProvider._isValidOutput(cluster, output.$metadata))
      throw new Error("Failed to update cluster");

    await ClusterProvider._untilActive(cluster.identifier);

    return {
      outs: {
        ...olds,
        ...cluster,
        tags: input.tags ?? olds.tags,
      },
    };
  }

  async delete(id: string) {
    const client = await ClusterProvider._getClient();

    const output = await client.send(
      await ClusterProvider._getSdk().then(
        (sdk) => new sdk.DeleteClusterCommand({ identifier: id }),
      ),
    );

    const cluster = {
      identifier: output.identifier,
      arn: output.arn,
      status: output.status,
      creationTime: output.creationTime?.toISOString(),
      deletionProtectionEnabled: output.deletionProtectionEnabled,
    };

    if (!ClusterProvider._isValidOutput(cluster, output.$metadata))
      throw new Error("Failed to delete cluster");

    await ClusterProvider._untilDeleted(id);
  }
}
