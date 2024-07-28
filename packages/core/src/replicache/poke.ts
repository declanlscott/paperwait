import { unique } from "remeda";
import { Resource } from "sst";

import { HttpError } from "../errors";

import type { Channel } from "../realtime";

export async function poke(channels: Array<Channel>) {
  const uniqueChannels = unique(channels);
  if (uniqueChannels.length === 0) return;

  const results = await Promise.allSettled(
    uniqueChannels.map(async (channel) => {
      try {
        const res = await fetch(
          `${Resource.ClientPartyKitUrl.value}/party/${channel}`,
          {
            method: "POST",
            headers: { "x-api-key": Resource.PartyKitApiKey.value },
          },
        );

        if (!res.ok) throw new HttpError(res.statusText, res.status);
      } catch (e) {
        console.error(`Failed to poke ${channel}`);

        return Promise.reject(e);
      }
    }),
  );

  results
    .filter((result) => result.status === "rejected")
    .forEach(({ reason }) => console.error(reason));
}
