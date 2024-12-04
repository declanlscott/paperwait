import {
  ClusterProvider,
  ClusterProviderInputs,
  ClusterProviderOutputs,
} from "./providers/cluster";

export namespace Dsql {
  export type ClusterInputs = {
    [TKey in keyof ClusterProviderInputs]: $util.Input<
      ClusterProviderInputs[TKey]
    >;
  };

  export type ClusterOutputs = {
    [TKey in keyof ClusterProviderOutputs]: $util.Output<
      ClusterProviderOutputs[TKey]
    >;
  };

  export class Cluster extends $util.dynamic.Resource {
    readonly identifier!: ClusterOutputs["identifier"];
    readonly arn!: ClusterOutputs["arn"];
    readonly creationTime!: ClusterOutputs["creationTime"];
    readonly deletionProtectionEnabled!: ClusterOutputs["deletionProtectionEnabled"];

    constructor(
      name: string,
      props: ClusterInputs,
      opts?: $util.CustomResourceOptions,
    ) {
      super(
        new ClusterProvider(),
        name,
        {
          ...props,
          identifier: undefined,
          arn: undefined,
          creationTime: undefined,
        },
        opts,
      );
    }
  }
}
