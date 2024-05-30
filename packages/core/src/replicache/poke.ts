import ky from "ky";
import { Resource } from "sst";

import type { Channel } from "../realtime";

export async function poke(channels: Array<Channel>) {
  const channelsSet = Array.from(new Set(channels));
  if (channelsSet.length === 0) return;

  const results = await Promise.allSettled(
    channelsSet.map(async (channel) => {
      try {
        await ky.post(
          `http${Resource.ClientIsDev ? "://localhost:4321" : `s://${Resource.ClientDomain.value}`}`,
          { headers: { "x-api-key": Resource.PartyKitApiKey.value } },
        );
      } catch (e) {
        console.error(`Failed to poke ${channel}`);

        return Promise.reject(e);
      }
    }),
  );

  results
    .filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    )
    .forEach((result) => console.error(result.reason));
}
