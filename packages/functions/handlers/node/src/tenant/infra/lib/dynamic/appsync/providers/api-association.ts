import { Appsync, Sts } from "@paperwait/core/utils/aws";

import type * as pulumi from "@pulumi/pulumi";

type ApiAssociationInput = Parameters<typeof Appsync.associateApi>[1];
export interface ApiAssociationProviderInputs extends ApiAssociationInput {
  clientRoleArn: string;
}

type ApiAssociationOutput = Required<
  NonNullable<
    Awaited<ReturnType<typeof Appsync.associateApi>>["apiAssociation"]
  >
>;
export interface ApiAssociationProviderOutputs extends ApiAssociationOutput {
  clientRoleArn: string;
}

export class ApiAssociationProvider implements pulumi.dynamic.ResourceProvider {
  static #sts = new Sts.Client();

  static async #getClient(roleArn: string) {
    const { Credentials } = await Sts.assumeRole(ApiAssociationProvider.#sts, {
      RoleArn: roleArn,
      RoleSessionName: "DomainNameProvider",
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
  }: ApiAssociationProviderInputs): Promise<
    pulumi.dynamic.CreateResult<ApiAssociationProviderOutputs>
  > {
    const client = await ApiAssociationProvider.#getClient(clientRoleArn);

    const output = await Appsync.associateApi(client, input);

    const apiAssociation = output.apiAssociation as ApiAssociationOutput;

    return {
      id: apiAssociation.domainName,
      outs: { ...apiAssociation, clientRoleArn },
    };
  }

  async read(
    domainName: string,
    props: ApiAssociationProviderOutputs,
  ): Promise<pulumi.dynamic.ReadResult<ApiAssociationProviderOutputs>> {
    const client = await ApiAssociationProvider.#getClient(props.clientRoleArn);

    const output = await Appsync.getApiAssociation(client, { domainName });

    const apiAssociation = output.apiAssociation as ApiAssociationOutput;

    return {
      props: { ...apiAssociation, clientRoleArn: props.clientRoleArn },
    };
  }

  async delete(domainName: string, props: ApiAssociationProviderOutputs) {
    const client = await ApiAssociationProvider.#getClient(props.clientRoleArn);

    await Appsync.disassociateApi(client, { domainName });
  }
}
