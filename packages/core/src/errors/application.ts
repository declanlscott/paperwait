import type { Domain } from "../schemas";

export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationError";
  }
}

export class InvalidMutationError extends ApplicationError {
  constructor(message = "Invalid mutation.") {
    super(message);
    this.name = "InvalidMutationError";
  }
}

export class EntityNotFoundError extends InvalidMutationError {
  constructor(domain?: Domain, id?: string | number) {
    super(`${domain ? domain : "Entity"} ${id ? `"${id}"` : ""} not found.`);
    this.name = "EntityNotFoundError";
  }
}

export class InvalidUserRoleError extends InvalidMutationError {
  constructor() {
    super("Invalid user role, access denied.");
    this.name = "InvalidUserRoleError";
  }
}

export class AccessDeniedError extends InvalidMutationError {
  constructor() {
    super("Access denied.");
    this.name = "AccessDeniedError";
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
