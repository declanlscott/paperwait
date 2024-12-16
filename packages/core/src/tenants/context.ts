import { assertNonPublicActor } from "../actors/context";

export const useTenant = () => ({
  id: assertNonPublicActor().properties.tenantId,
});
