import * as fs from "fs/promises";
import path from "path";

/**
 * There currently isn't an API to get a list of AWS curated lambda layers,
 * so this function reads a JSON file that contains the ARNs of the layers
 * found in the [AWS documentation](https://docs.aws.amazon.com/systems-manager/latest/userguide/ps-integration-lambda-extensions.html#ps-integration-lambda-extensions-add).
 */
export async function getLambdaLayerArn(
  name: string,
  architecture: "arm64" | "x86_64",
) {
  const data = await fs.readFile("infra/aws-layer-names.json", "utf-8");

  const names = JSON.parse(data) as Record<
    string,
    Record<typeof architecture, Array<string>>
  >;

  return aws.getRegionOutput({}).name.apply((region) => {
    const arn = names[name][architecture].find((arn) =>
      arn.includes(`:${region}:`),
    );
    if (!arn)
      throw new Error(
        `No lambda layer ARN found matching "${name}" in "${region}" with "${architecture}" architecture.`,
      );

    return arn;
  });
}

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
