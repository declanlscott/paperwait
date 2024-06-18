/* eslint-disable @typescript-eslint/consistent-type-imports */
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    session: import("@paperwait/core/auth").LuciaSession | null;
    user: import("@paperwait/core/auth").LuciaUser | null;
    org: Pick<
      import("@paperwait/core/organization").Organization,
      "id" | "slug"
    > | null;
  }
}
