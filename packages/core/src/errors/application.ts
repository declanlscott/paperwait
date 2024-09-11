export type ApplicationErrorName =
  | "ApplicationError"
  | "Unauthenticated"
  | "EntityNotFound"
  | "AccessDenied"
  | "MissingContextProvider";

export class ApplicationError extends Error {
  public name: ApplicationErrorName;

  constructor(message: string) {
    super(message);
    this.name = "ApplicationError";
  }
}

export class Unauthenticated extends ApplicationError {
  public name: Extract<ApplicationErrorName, "Unauthenticated">;

  constructor(message = "Unauthenticated") {
    super(message);
    this.name = "Unauthenticated";
  }
}

export class EntityNotFound extends ApplicationError {
  public name: Extract<ApplicationErrorName, "EntityNotFound">;

  constructor(domain?: string, id?: string | number) {
    super(`Entity "${id}" not found in "${domain}".`);
    this.name = "EntityNotFound";
  }
}

export class AccessDenied extends ApplicationError {
  public name: Extract<ApplicationErrorName, "AccessDenied">;

  constructor(message = "Access denied") {
    super(message);
    this.name = "AccessDenied";
  }
}

export class MissingContextProvider extends ApplicationError {
  public name: Extract<ApplicationErrorName, "MissingContextProvider">;

  constructor(context?: string) {
    const message = context
      ? `"use${context}" must be used within a "${context}Provider."`
      : "This hook must be used within a corresponding context provider.";
    super(message);
    this.name = "MissingContextProvider";
  }
}
