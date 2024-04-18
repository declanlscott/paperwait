import type { LuciaRegister } from "@paperwait/core/auth";

declare module "lucia" {
  interface Register extends LuciaRegister {}
}
