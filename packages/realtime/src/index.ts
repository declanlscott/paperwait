import {
  HttpError,
  MethodNotAllowed,
  Unauthorized,
} from "@paperwait/core/errors/http";

import type * as Party from "partykit/server";

export default class Server implements Party.Server {
  options = {
    hibernate: true,
  } satisfies Party.ServerOptions;

  constructor(readonly room: Party.Room) {}

  static onBeforeConnect(request: Party.Request, lobby: Party.Lobby) {
    try {
      if (
        new URL(request.url).searchParams.get("replicacheLicenseKey") !==
        lobby.env.REPLICACHE_LICENSE_KEY
      )
        throw new Unauthorized();

      return request;
    } catch (e) {
      console.error(e);

      if (e instanceof HttpError)
        return new Response(e.message, { status: e.statusCode });

      return new Response("Internal server error", { status: 500 });
    }
  }

  static onBeforeRequest(request: Party.Request, lobby: Party.Lobby) {
    try {
      if (request.method !== "POST") throw new MethodNotAllowed();

      if (request.headers.get("x-api-key") !== lobby.env.API_KEY)
        throw new Unauthorized();

      return request;
    } catch (e) {
      console.error(e);

      if (e instanceof HttpError)
        return new Response(e.message, { status: e.statusCode });

      return new Response("Internal server error", { status: 500 });
    }
  }

  async onRequest(request: Party.Request) {
    const message = await request.text();

    this.room.broadcast(message);

    return new Response(null, { status: 204 });
  }
}

Server satisfies Party.Worker;
