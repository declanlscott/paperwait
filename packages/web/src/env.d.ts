/* eslint-disable @typescript-eslint/consistent-type-imports */
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    session: import("@paperwait/core/auth").LuciaSession | null;
    user: import("@paperwait/core/auth").LuciaUser | null;
  }
}
