/* eslint-disable @typescript-eslint/consistent-type-imports */
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    session: import("lucia").Session | null;
    user: import("lucia").User | null;
  }
}
