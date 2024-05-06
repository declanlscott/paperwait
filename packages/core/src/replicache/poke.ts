import { HOST } from "@paperwait/core/constants";
import { Resource } from "sst";

export async function poke(entity: string) {
  const res = await fetch(
    `http${Resource.IsDev ? `://${HOST.REALTIME.DEV}` : `s://${HOST.REALTIME.PROD}`}/party/${entity}`,
    { method: "POST", headers: { "x-api-key": Resource.PartyKitApiKey.value } },
  );

  if (!res.ok) {
    console.error(`Failed to poke ${entity}: ${res.status} ${res.statusText}`);
  }
}

export async function pokeMany(entities: Array<string>) {
  const results = await Promise.allSettled(
    Array.from(entities).map((entity) => poke(entity)),
  );

  results
    .filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    )
    .forEach(console.error);
}
