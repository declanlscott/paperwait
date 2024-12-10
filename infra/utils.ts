import { join } from "node:path";

import type { Resource } from "sst";

export const normalizePath = (path: string, root = $cli.paths.root) =>
  join(root, path);

export const link = (...args: Parameters<typeof injectLinkables>) => ({
  environment: {
    variables: injectLinkables(...args),
  },
});

export function injectLinkables(
  linkables: {
    [TKey in keyof Resource]?: $util.Input<Record<string, unknown>>;
  },
  prefix = "CUSTOM_RESOURCE",
) {
  const vars: Record<string, $util.Output<string>> = {};
  for (const logicalName in linkables) {
    const value = linkables[logicalName as keyof Resource];

    vars[`${prefix}_${logicalName}`] = $jsonStringify($output(value));
  }

  return vars;
}
