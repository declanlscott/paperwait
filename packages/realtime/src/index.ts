import {
  HttpError,
  MethodNotAllowedError,
  UnauthorizedError,
} from "@paperwait/core/errors";
import { Resource } from "sst";

import type * as Party from "partykit/server";

export default class Server implements Party.Server {
  options = {
    hibernate: true,
  } satisfies Party.ServerOptions;

  constructor(readonly room: Party.Room) {}

  static async onBeforeConnect(request: Party.Request) {
    try {
      if (
        request.headers.get("Authorization") !==
        Resource.ClientReplicacheLicenseKey.value
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

  static async onBeforeRequest(request: Party.Request) {
    try {
      if (request.method !== "POST") throw new MethodNotAllowedError();

      if (
        request.headers.get("Authorization") !== Resource.PartyKitApiKey.value
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

  async onRequest() {
    this.room.broadcast("poke");

    return new Response(null, { status: 204 });
  }
}

Server satisfies Party.Worker;
