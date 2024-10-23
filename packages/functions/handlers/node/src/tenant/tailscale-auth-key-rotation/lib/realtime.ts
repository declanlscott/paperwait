import { HttpError } from "@paperwait/core/utils/errors";

import { useContext } from "./context";

export async function send(channel: string, message: string) {
  const { resource } = useContext();

  const res = await fetch(`${resource.Realtime.url}/party/${channel}`, {
    method: "POST",
    headers: { "x-api-key": resource.Realtime.apiKey },
    body: message,
  });

  if (!res.ok)
    throw new HttpError.Error(
      `Failed to send message to channel ${channel}`,
      res.status,
    );
}
