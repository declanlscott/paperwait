import path from "path";

export const normalizePath = (p: string, r = $cli.paths.root) =>
  path.join(r, p);

export const injectLinkables = (
  linkables: Array<{
    name: $util.Output<string>;
    getSSTLink: () => sst.Definition;
  }>,
  prefix = "CUSTOM_RESOURCE_",
) =>
  $util
    .all(
      linkables.map(
        (linkable) =>
          [linkable.name, linkable.getSSTLink().properties] as const,
      ),
    )
    .apply((resources) =>
      resources.reduce(
        (vars, [name, props]) => {
          vars[`${prefix}${name}`] = JSON.stringify(props);

          return vars;
        },
        {} as Record<string, string>,
      ),
    );
