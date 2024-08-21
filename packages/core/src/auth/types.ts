import type { Organization } from "../organization/organization.sql";
import type { LuciaSession, LuciaUser } from "./lucia";

export type Auth = {
  session: LuciaSession | null;
  user: LuciaUser | null;
  org: Pick<Organization, "id" | "slug"> | null;
};

export type Authenticated = {
  [TKey in keyof Auth]: NonNullable<Auth[TKey]>;
} & { isAuthed: true };

export type Unauthenticated = {
  [TKey in keyof Auth]: null;
} & { isAuthed: false };
