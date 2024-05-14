import { Resource } from "sst";

export async function poke(entity: string) {
  const res = await fetch(
    `http${Resource.ClientIsDev ? `://localhost:4321` : `s://${Resource.ClientDomain.value}`}`,
    { method: "POST", headers: { "x-api-key": Resource.PartyKitApiKey.value } },
  );

  if (!res.ok) {
    console.error(
      new Error(`Failed to poke ${entity}: ${res.status} ${res.statusText}`),
    );
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
