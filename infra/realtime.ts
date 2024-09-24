import { partyKitUrl } from "./secrets";

export const partyKitApiKey = new random.RandomPassword("PartyKitApiKey", {
  length: 32,
});

export const realtime = new sst.Linkable("Realtime", {
  properties: {
    apiKey: partyKitApiKey.result,
    url: partyKitUrl.value,
  },
});
