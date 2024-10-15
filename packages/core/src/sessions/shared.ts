import type { Tenant } from "../tenants/sql";
import type { UserWithProfile } from "../users/sql";
import type { Session } from "./sql";

export type Authenticated = {
  isAuthed: true;
  user: UserWithProfile;
  session: Session;
  tenant: Tenant;
};

export type Unauthenticated = {
  isAuthed: false;
  user: null;
  session: null;
  tenant: null;
};

export type Auth = Authenticated | Unauthenticated;
