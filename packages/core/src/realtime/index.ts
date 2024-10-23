import { Resource } from "sst";

import { HttpError } from "../utils/errors";

export namespace Realtime {
  export function formatChannel(prefix: string, id: string) {
    return `${prefix}_${id}`;
  }

  export type Channel = ReturnType<typeof formatChannel>;

  export async function send(channel: Channel, message: string) {
    const res = await fetch(`${Resource.Realtime.url}/party/${channel}`, {
      method: "POST",
      headers: { "x-api-key": Resource.Realtime.apiKey },
      body: message,
    });

    if (!res.ok)
      throw new HttpError.Error(
        `Failed to send message to channel ${channel}`,
        res.status,
      );
  }
}
