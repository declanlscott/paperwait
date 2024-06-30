import ky from "ky";
import { unique } from "remeda";
import { Resource } from "sst";

import type { Channel } from "../realtime";

export async function poke(channels: Array<Channel>) {
  const uniqueChannels = unique(channels);
  if (uniqueChannels.length === 0) return;

  const results = await Promise.allSettled(
    uniqueChannels.map(async (channel) => {
      try {
        await ky.post(`${Resource.ClientPartyKitUrl.value}/party/${channel}`, {
          headers: { "x-api-key": Resource.PartyKitApiKey.value },
        });
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
