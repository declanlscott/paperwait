import { physicalName } from "../../../.sst/platform/src/components/naming";
import { ClusterProvider } from "./providers/cluster";

import type {
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

  export interface Cluster extends ClusterOutputs {}
  export class Cluster extends $util.dynamic.Resource {
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
          tags: {
            Name: physicalName(256, name),
            "sst:app": $app.name,
            "sst:stage": $app.stage,
            ...props.tags,
          },
          identifier: undefined,
          arn: undefined,
          status: undefined,
          creationTime: undefined,
        },
        opts,
      );
    }
  }
}
