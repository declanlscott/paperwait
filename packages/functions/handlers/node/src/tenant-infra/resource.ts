import { parseResource } from "@paperwait/core/utils/helpers";

import type { Resource } from "sst";

export const resource = parseResource<{
  [TKey in keyof Pick<
    Resource,
    "PulumiBackendBucket" | "Meta" | "Cloud" | "Realtime"
  >]: Omit<Resource[TKey], "type">;
}>("CUSTOM_RESOURCE_");
