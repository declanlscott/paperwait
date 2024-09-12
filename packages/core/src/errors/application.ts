export type ApplicationErrorName =
  | "Unauthenticated"
  | "EntityNotFound"
  | "AccessDenied"
  | "MissingContextProvider";

export class ApplicationError extends Error {
  public declare readonly name: ApplicationErrorName;

  constructor(message: string) {
    super(message);
  }
}

export class Unauthenticated extends ApplicationError {
  public readonly name = "Unauthenticated";

  constructor(message = "Unauthenticated") {
    super(message);
  }
}

export class EntityNotFound extends ApplicationError {
  public readonly name = "EntityNotFound";

  constructor(domain?: string, id?: string | number) {
    super(`Entity "${id}" not found in "${domain}".`);
  }
}

export class AccessDenied extends ApplicationError {
  public readonly name = "AccessDenied";

  constructor(message = "Access denied") {
    super(message);
  }
}

export class MissingContextProvider extends ApplicationError {
  public readonly name = "MissingContextProvider";

  constructor(contextName?: string) {
    super(
      contextName
        ? `"use${contextName}" must be used within a "${contextName}Provider."`
        : "This hook must be used within a corresponding context provider.",
    );
  }
}
