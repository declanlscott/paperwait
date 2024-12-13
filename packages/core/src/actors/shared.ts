import type { Authenticated, Unauthenticated } from "../auth/shared";
import type { Tenant } from "../tenants/sql";

export type UserActor = {
  type: "user";
  properties: Authenticated | Unauthenticated;
};

export type SystemActor = {
  type: "system";
  properties: {
    tenantId: Tenant["id"];
  };
};

export type Actor = UserActor | SystemActor;
