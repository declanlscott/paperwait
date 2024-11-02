import { Appsync, Sts } from "@paperwait/core/utils/aws";

import type * as pulumi from "@pulumi/pulumi";

type DomainNameInput = Parameters<typeof Appsync.createDomainName>[1];
export interface DomainNameProviderInputs extends DomainNameInput {
  clientRoleArn: string;
}

type DomainNameOutput = Required<
  NonNullable<
    Awaited<ReturnType<typeof Appsync.createDomainName>>["domainNameConfig"]
  >
>;
export interface DomainNameProviderOutputs extends DomainNameOutput {
  clientRoleArn: string;
}

export class DomainNameProvider implements pulumi.dynamic.ResourceProvider {
  static #sts = new Sts.Client();

  static async #getClient(roleArn: string) {
    const { Credentials } = await Sts.assumeRole(DomainNameProvider.#sts, {
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
  }: DomainNameProviderInputs): Promise<
    pulumi.dynamic.CreateResult<DomainNameProviderOutputs>
  > {
    const client = await DomainNameProvider.#getClient(clientRoleArn);

    const output = await Appsync.createDomainName(client, input);

    const domainNameConfig = output.domainNameConfig as DomainNameOutput;

    return {
      id: domainNameConfig.domainName,
      outs: { ...domainNameConfig, clientRoleArn },
    };
  }

  async read(
    domainName: string,
    props: DomainNameProviderOutputs,
  ): Promise<pulumi.dynamic.ReadResult<DomainNameProviderOutputs>> {
    const client = await DomainNameProvider.#getClient(props.clientRoleArn);

    const output = await Appsync.getDomainName(client, { domainName });

    const domainNameConfig = output.domainNameConfig as DomainNameOutput;

    return {
      props: { clientRoleArn: props.clientRoleArn, ...domainNameConfig },
    };
  }

  async update(
    _domainName: string,
    olds: DomainNameProviderOutputs,
    { clientRoleArn, ...input }: DomainNameProviderInputs,
  ): Promise<pulumi.dynamic.UpdateResult<DomainNameProviderOutputs>> {
    const client = await DomainNameProvider.#getClient(clientRoleArn);

    const output = await Appsync.updateDomainName(client, input);

    const domainNameConfig = output.domainNameConfig as DomainNameOutput;

    return {
      outs: { ...olds, clientRoleArn, ...domainNameConfig },
    };
  }

  async delete(domainName: string, props: DomainNameProviderOutputs) {
    const client = await DomainNameProvider.#getClient(props.clientRoleArn);

    await Appsync.deleteDomainName(client, { domainName });
  }
}
