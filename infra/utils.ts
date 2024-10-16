import { createCipheriv } from "node:crypto";
import { join } from "node:path";

import {
  customResourceEncryptionIv,
  customResourceEncryptionKey,
} from "./misc";

export const normalizePath = (path: string, root = $cli.paths.root) =>
  join(root, path);

export const link = (...params: Parameters<typeof injectLinkables>) => ({
  environment: {
    variables: injectLinkables(...params),
  },
});

export const injectLinkables = (
  linkables: Record<string, $util.Input<Record<string, unknown>>>,
  prefix = "CUSTOM_RESOURCE_",
) =>
  $resolve([
    customResourceEncryptionKey.hex,
    customResourceEncryptionIv.hex,
  ]).apply(([key, iv]) =>
    Object.entries(linkables).reduce(
      (vars, [name, props]) => {
        vars[`${prefix}${name}`] = $output(props).apply((props) => {
          const cipher = createCipheriv(
            "aes-256-gcm",
            Buffer.from(key, "hex"),
            Buffer.from(iv, "hex"),
          );

          return Buffer.from(
            cipher.update(JSON.stringify(props), "utf-8", "hex") +
              cipher.final("hex") +
              cipher.getAuthTag().toString("hex"),
            "hex",
          ).toString("base64");
        });

        return vars;
      },
      {} as Record<string, $util.Output<string>>,
    ),
  );
