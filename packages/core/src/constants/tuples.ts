export const oAuth2ProviderVariants = ["entra-id", "google"] as const;
export type OAuth2ProviderVariant = (typeof oAuth2ProviderVariants)[number];

export const orgStatuses = ["initializing", "active", "suspended"] as const;
export type OrgStatus = (typeof orgStatuses)[number];

export const productStatuses = ["draft", "published"] as const;
export type ProductStatus = (typeof productStatuses)[number];

export const roomStatuses = ["draft", "published"] as const;
export type RoomStatus = (typeof roomStatuses)[number];

export const userRoles = [
  "administrator",
  "operator",
  "manager",
  "customer",
] as const;
export type UserRole = (typeof userRoles)[number];

export const workflowStatusTypes = [
  "Pending",
  "New",
  "InProgress",
  "Completed",
] as const;
export type WorkflowStatusType = (typeof workflowStatusTypes)[number];
