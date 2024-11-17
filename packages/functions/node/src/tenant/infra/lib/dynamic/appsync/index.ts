import * as pulumi from "@pulumi/pulumi";

import { ApiProvider } from "./providers/api";
import { ChannelNamespaceProvider } from "./providers/channel-namespace";

import type { ApiProviderInputs, ApiProviderOutputs } from "./providers/api";
import type {
  ChannelNamespaceProviderInputs,
  ChannelNamespaceProviderOutputs,
} from "./providers/channel-namespace";

export type ApiInputs = {
  [TKey in keyof ApiProviderInputs]: pulumi.Input<ApiProviderInputs[TKey]>;
};

export type ApiOutputs = {
  [TKey in keyof ApiProviderOutputs]: pulumi.Output<ApiProviderOutputs[TKey]>;
};

export class Api extends pulumi.dynamic.Resource {
  readonly apiId!: ApiOutputs["apiId"];
  readonly name!: ApiOutputs["name"];
  readonly ownerContact!: ApiOutputs["ownerContact"];
  readonly tags!: ApiOutputs["tags"];
  readonly dns!: ApiOutputs["dns"];
  readonly apiArn!: ApiOutputs["apiArn"];
  readonly created!: ApiOutputs["created"];
  readonly xrayEnabled!: ApiOutputs["xrayEnabled"];
  readonly wafWebAclArn!: ApiOutputs["wafWebAclArn"];
  readonly eventConfig!: ApiOutputs["eventConfig"];

  constructor(
    name: string,
    props: ApiInputs,
    opts?: pulumi.CustomResourceOptions,
  ) {
    super(
      new ApiProvider(name),
      name,
      {
        ...props,
        apiId: undefined,
        dns: undefined,
        apiArn: undefined,
        created: undefined,
        xrayEnabled: undefined,
        wafWebAclArn: undefined,
      },
      opts,
    );
  }
}

export type ChannelNamespaceInputs = {
  [TKey in keyof ChannelNamespaceProviderInputs]: pulumi.Input<
    ChannelNamespaceProviderInputs[TKey]
  >;
};

export type ChannelNamespaceOutputs = {
  [TKey in keyof ChannelNamespaceProviderOutputs]: pulumi.Output<
    ChannelNamespaceProviderOutputs[TKey]
  >;
};

export class ChannelNamespace extends pulumi.dynamic.Resource {
  readonly apiId!: ChannelNamespaceOutputs["apiId"];
  readonly name!: ChannelNamespaceOutputs["name"];
  readonly subscribeAuthModes!: ChannelNamespaceOutputs["subscribeAuthModes"];
  readonly publishAuthModes!: ChannelNamespaceOutputs["publishAuthModes"];
  readonly codeHandlers!: ChannelNamespaceOutputs["codeHandlers"];
  readonly tags!: ChannelNamespaceOutputs["tags"];
  readonly channelNamespaceArn!: ChannelNamespaceOutputs["channelNamespaceArn"];
  readonly created!: ChannelNamespaceOutputs["created"];
  readonly lastModified!: ChannelNamespaceOutputs["lastModified"];

  constructor(
    name: string,
    props: ChannelNamespaceInputs,
    opts?: pulumi.CustomResourceOptions,
  ) {
    super(
      new ChannelNamespaceProvider(),
      name,
      {
        ...props,
        channelNamespaceArn: undefined,
        created: undefined,
        lastModified: undefined,
      },
      opts,
    );
  }
}
