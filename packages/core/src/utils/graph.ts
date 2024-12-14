import { Client as GraphClient } from "@microsoft/microsoft-graph-client";

import { Utils } from ".";

import type GraphTypes from "@microsoft/microsoft-graph-types";

export type GraphContext = GraphClient;
export const GraphContext = Utils.createContext<GraphContext>("Graph");

export const useGraph = GraphContext.use;

export const withGraph = <
  TGraphContext extends GraphContext,
  TCallback extends () => ReturnType<TCallback>,
>(
  context: TGraphContext,
  callback: TCallback,
) => GraphContext.with(context, callback);

export namespace Graph {
  export const Client = GraphClient;
  export type Client = GraphClient;

  export const me = async () => useGraph().api("/me").get() as GraphTypes.User;
}
