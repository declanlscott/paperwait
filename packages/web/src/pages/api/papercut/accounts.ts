import { transact } from "@paperwait/core/database";
import {
  BadRequestError,
  DatabaseError,
  HttpError,
} from "@paperwait/core/errors";
import {
  globalPermissions,
  syncPapercutAccounts,
  SyncPapercutAccountsMutationArgs,
} from "@paperwait/core/mutations";
import { formatChannel } from "@paperwait/core/realtime";
import { poke } from "@paperwait/core/replicache";
import { validate } from "@paperwait/core/valibot";

import { authorize } from "~/lib/auth/authorize";

import type { APIContext } from "astro";

export async function PUT(context: APIContext) {
  try {
    const { user } = authorize(context, globalPermissions.syncPapercutAccounts);

    const requestBody = await context.request.json();

    await transact(
      async (tx) =>
        await syncPapercutAccounts(
          tx,
          user.orgId,
          validate(SyncPapercutAccountsMutationArgs, requestBody, {
            Error: BadRequestError,
            message: "Failed to parse request body",
          }),
        ),
    );

    await poke([formatChannel("org", user.orgId)]);

    return new Response(undefined, { status: 204 });
  } catch (e) {
    if (e instanceof HttpError)
      return new Response(e.message, { status: e.statusCode });
    if (e instanceof DatabaseError)
      return new Response(e.message, { status: 500 });

    return new Response("Internal server error", { status: 500 });
  }
}
