// import { Constants } from "@printworks/core/utils/constants";
// import usePartySocket from "partysocket/react";

// import { useAuthenticated } from "~/app/lib/hooks/auth";
// import { useResource } from "~/app/lib/hooks/resource";

// type RealtimeProps = {
//   channel: string;
// };

// export function useRealtime(props: RealtimeProps) {
//   const { replicacheLicenseKey } = useResource();

//   const { replicache } = useAuthenticated();

//   return usePartySocket({
//     host: realtimeUrl,
//     room: props.channel,
//     onMessage: (message) => {
//       if (message.data === Constants.POKE) void replicache.pull();
//     },
//     query: { replicacheLicenseKey },
//   });
// }

import { WebSocket } from "partysocket";

const socket = new WebSocket("wss://", ["aws-appsync-event-ws", "header-"]);
