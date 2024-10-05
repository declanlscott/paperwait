import { parseResource } from "@paperwait/core/utils/helpers";

import type { Resource } from "sst";

export const resource = parseResource<{
  [TKey in keyof Pick<
    Resource,
    "AppData" | "Cloud" | "InfraBucket" | "Realtime" | "WebOutputs"
  >]: Omit<Resource[TKey], "type">;
}>("CUSTOM_RESOURCE_");
