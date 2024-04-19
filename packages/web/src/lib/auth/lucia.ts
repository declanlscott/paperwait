import type { LuciaRegister } from "@paperwait/core/auth";

declare module "lucia" {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface Register extends LuciaRegister {}
}
