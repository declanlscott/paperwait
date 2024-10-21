import { join } from "node:path";

import type { Resource } from "sst";

export const normalizePath = (path: string, root = $cli.paths.root) =>
  join(root, path);

export const link = (...params: Parameters<typeof injectLinkables>) => ({
  environment: {
    variables: injectLinkables(...params),
  },
});

export const injectLinkables = (
  linkables: {
    [TKey in keyof Resource]?: $util.Input<Record<string, unknown>>;
  },
  prefix = "CUSTOM_RESOURCE_",
) =>
  Object.entries(linkables).reduce(
    (vars, [name, props]) => {
      vars[`${prefix}${name}`] = $output(props).apply((props) =>
        JSON.stringify(props),
      );

      return vars;
    },
    {} as Record<string, $util.Output<string>>,
  );
