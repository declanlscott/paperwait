import { REALTIME_ENV_KEY } from "@paperwait/core/constants";
import {
  HttpError,
  MethodNotAllowedError,
  UnauthorizedError,
} from "@paperwait/core/errors";

import type * as Party from "partykit/server";

export default class Server implements Party.Server {
  options = {
    hibernate: true,
  } satisfies Party.ServerOptions;

  constructor(readonly room: Party.Room) {}

  static onBeforeConnect(request: Party.Request, lobby: Party.Lobby) {
    try {
      if (
        request.headers.get("x-replicache-license-key") !==
        lobby.env[REALTIME_ENV_KEY.REPLICACHE_LICENSE_KEY]
      )
        throw new UnauthorizedError();

      return request;
    } catch (e) {
      console.error(e);

      if (e instanceof HttpError)
        return new Response(e.message, { status: e.statusCode });

      return new Response("Internal Server Error", { status: 500 });
    }
  }

  static onBeforeRequest(request: Party.Request, lobby: Party.Lobby) {
    try {
      if (request.method !== "POST") throw new MethodNotAllowedError();

      if (
        request.headers.get("x-api-key") !== lobby.env[REALTIME_ENV_KEY.API_KEY]
      )
        throw new UnauthorizedError();

      return request;
    } catch (e) {
      console.error(e);

      if (e instanceof HttpError)
        return new Response(e.message, { status: e.statusCode });

      return new Response("Internal Server Error", { status: 500 });
    }
  }

  onRequest() {
    this.room.broadcast("poke");

    return new Response(null, { status: 204 });
  }
}

Server satisfies Party.Worker;
