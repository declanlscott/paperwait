import type { Order } from "../order/order.sql";
import type { User } from "../user/user.sql";

export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationError";
  }
}

export class InvalidUserRoleError extends ApplicationError {
  constructor(message = "Invalid user role, access denied.") {
    super(message);
    this.name = "InvalidUserRoleError";
  }
}

export class EntityNotFoundError extends ApplicationError {
  constructor(entity?: string, entityId?: string | number) {
    super(
      `${entity ? entity : "entity"} not found${entityId ? `: ${entityId}` : ""}.`,
    );
    this.name = "UserNotFoundError";
  }
}

export class OrderAccessDeniedError extends ApplicationError {
  constructor(info?: { orderId: Order["id"]; userId: User["id"] }) {
    super(
      info
        ? `User "${info.userId}" does not have access to order "${info.orderId}."`
        : "Order access denied",
    );
    this.name = "OrderAccessDeniedError";
  }
}

export class MissingContextProviderError extends ApplicationError {
  constructor(context?: string) {
    const message = context
      ? `"use${context}" must be used within a "${context}Provider."`
      : "This hook must be used within a corresponding context provider.";
    super(message);
    this.name = "MissingContextProviderError";
  }
}
