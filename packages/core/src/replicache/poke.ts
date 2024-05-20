import ky from "ky";
import { Resource } from "sst";

export async function poke(channel: string) {
  try {
    await ky.post(
      `http${Resource.ClientIsDev ? "://localhost:4321" : `s://${Resource.ClientDomain.value}`}`,
      { headers: { "x-api-key": Resource.PartyKitApiKey.value } },
    );
  } catch (e) {
    console.error(`Failed to poke ${channel}`);

    return Promise.reject(e);
  }
}

export async function pokeMany(channels: Array<string>) {
  const results = await Promise.allSettled(
    Array.from(new Set(channels)).map((channel) => poke(channel)),
  );

  results
    .filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    )
    .forEach((result) => console.error(result.reason));
}
