import usePartySocket from "partysocket/react";

import { useReplicache } from "~/app/lib/replicache";
import { useResource } from "~/app/lib/resource";

type RealtimeProps = {
  room: string;
};

export function useRealtime(props: RealtimeProps) {
  const { PartyKitUrl, ReplicacheLicenseKey } = useResource();

  const replicache = useReplicache();

  return usePartySocket({
    host: PartyKitUrl.value,
    room: props.room,
    onMessage: (message) => {
      if (message.data === "poke") {
        if (!replicache) return;
        void replicache.pull();
      }
    },
    query: {
      replicacheLicenseKey: ReplicacheLicenseKey.value,
    },
  });
}
