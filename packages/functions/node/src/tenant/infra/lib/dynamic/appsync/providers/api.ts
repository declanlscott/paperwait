import { Appsync, Sts } from "@printworks/core/utils/aws";

import { logicalName, physicalName } from "../../../naming";

import type * as pulumi from "@pulumi/pulumi";

type ApiInput = Parameters<typeof Appsync.createApi>[1];
export interface ApiProviderInputs extends Omit<ApiInput, "name"> {
  name?: string;
  clientRoleArn: string;
}

type ApiOutput = Required<
  NonNullable<Awaited<ReturnType<typeof Appsync.createApi>>["api"]>
>;
export interface ApiProviderOutputs extends ApiOutput {
  clientRoleArn: string;
}

export class ApiProvider implements pulumi.dynamic.ResourceProvider {
  private static _sts = new Sts.Client();

  private _logicalName: string;

  constructor(name: string) {
    this._logicalName = logicalName(name);
  }

  private static _getClient = async (roleArn: string) =>
    new Appsync.Client({
      credentials: await Sts.getAssumeRoleCredentials(ApiProvider._sts, {
        type: "arn",
        roleArn,
        roleSessionName: "ApiProvider",
      }),
    });

  async create({
    clientRoleArn,
    ...input
  }: ApiProviderInputs): Promise<
    pulumi.dynamic.CreateResult<ApiProviderOutputs>
  > {
    const client = await ApiProvider._getClient(clientRoleArn);

    const output = await Appsync.createApi(client, {
      name: physicalName(50, this._logicalName),
      ...input,
    });

    const api = output.api as ApiOutput;

    return {
      id: api.apiId,
      outs: {
        clientRoleArn,
        ...api,
      },
    };
  }

  async read(
    id: string,
    props: ApiProviderOutputs,
  ): Promise<pulumi.dynamic.ReadResult<ApiProviderOutputs>> {
    const client = await ApiProvider._getClient(props.clientRoleArn);

    const output = await Appsync.getApi(client, { apiId: id });
    if (!output.api) throw new Error("Missing api");

    const api = output.api as ApiOutput;

    return {
      id,
      props: { ...props, ...api },
    };
  }

  async update(
    id: string,
    olds: ApiProviderOutputs,
    { clientRoleArn, ...input }: ApiProviderInputs,
  ): Promise<pulumi.dynamic.UpdateResult<ApiProviderOutputs>> {
    const client = await ApiProvider._getClient(clientRoleArn);

    const output = await Appsync.updateApi(client, {
      apiId: id,
      name: olds.name,
      ...input,
    });
    if (!output.api) throw new Error("Missing api");

    const api = output.api as ApiOutput;

    return {
      outs: { ...olds, clientRoleArn, ...api },
    };
  }

  async delete(id: string, props: ApiProviderOutputs) {
    const client = await ApiProvider._getClient(props.clientRoleArn);

    await Appsync.deleteApi(client, { apiId: id });
  }
}
