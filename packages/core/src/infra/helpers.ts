import { Resource } from "sst";

/**
 * A modified version of the [original](https://www.github.com/sst/ion/blob/a3fd8fa92d559c91b89731faa6a9b843c60f95af/platform/src/components/naming.ts), which is licensed under the [MIT License](https://www.github.com/sst/ion/blob/a3fd8fa92d559c91b89731faa6a9b843c60f95af/LICENSE). Credit to the authors at SST.
 */
export function physicalName(maxLength: number, name: string, suffix = "") {
  // This function does the following:
  // - Removes all non-alphanumeric characters
  // - Prefixes the name with the app name and stage
  // - Truncates the name if it's too long

  const app = Resource.Meta.app;

  name = name.replace(/[^a-zA-Z0-9]/g, "");

  const prefixedName = (() => {
    const L = maxLength - suffix.length;
    const appLen = app.name.length;
    const stageLen = app.stage.length;
    const nameLen = name.length;

    if (appLen + stageLen + nameLen + 2 <= L) {
      return `${app.name}-${app.stage}-${name}`;
    }

    if (stageLen + nameLen + 1 <= L) {
      const appTruncated = app.name.substring(0, L - stageLen - nameLen - 2);
      return appTruncated === ""
        ? `${app.stage}-${name}`
        : `${appTruncated}-${app.stage}-${name}`;
    }

    const stageTruncated = app.stage.substring(0, Math.max(8, L - nameLen - 1));
    const nameTruncated = name.substring(0, L - stageTruncated.length - 1);
    return `${stageTruncated}-${nameTruncated}`;
  })();

  return `${prefixedName}${suffix}`;
}
