import { Link } from "~/.sst/platform/src/components/link.js";
import { physicalName } from "~/.sst/platform/src/components/naming.js";
import { ClusterProvider } from "./providers/cluster.js";

import type {
  ClusterProviderInputs,
  ClusterProviderOutputs,
} from "./providers/cluster.js";

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
  export class Cluster extends $util.dynamic.Resource implements Link.Linkable {
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

    get endpoint() {
      return $interpolate`${this.id}.${aws.getRegionOutput().name}.on.aws`;
    }

    getSSTLink(): Link.Definition<{
      hostname: $util.Output<string>;
      database: $util.Output<string>;
      user: $util.Output<string>;
      ssl: $util.Output<string>;
    }> {
      return {
        properties: {
          hostname: this.endpoint,
          database: $output("postgres"),
          user: $output("admin"),
          ssl: $output("require"),
        },
        include: [
          sst.aws.permission({
            actions: ["dsql:DbConnectAdmin"],
            resources: [this.arn],
          }),
        ],
      };
    }
  }
}
