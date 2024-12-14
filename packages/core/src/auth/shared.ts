import { createSubjects } from "@openauthjs/openauth";
import * as v from "valibot";

import { Constants } from "../utils/constants";
import { nanoIdSchema, timestampsSchema } from "../utils/shared";

import type { Tenant } from "../tenants/sql";
import type { UserWithProfile } from "../users/sql";

export type Authenticated = {
  isAuthed: true;
  user: UserWithProfile;
  tenant: Tenant;
};

export type Unauthenticated = {
  isAuthed: false;
  user: null;
  tenant: null;
};

export type Auth = Authenticated | Unauthenticated;

export const oauth2ProvidersTableName = "oauth2_providers";

export const oauth2ProviderTypes = [
  Constants.ENTRA_ID,
  Constants.GOOGLE,
] as const;
export type Oauth2ProviderType = (typeof oauth2ProviderTypes)[number];

export const oauth2ProvidersSchema = v.object({
  id: v.string(),
  tenantId: v.string(),
  variant: v.picklist(oauth2ProviderTypes),
  ...timestampsSchema.entries,
});

export const subjects = createSubjects({
  user: v.object({
    id: nanoIdSchema,
    tenantId: nanoIdSchema,
  }),
});
