export type ReplicacheErrorName =
  | "ReplicacheError"
  | "BadRequest"
  | "Unauthorized"
  | "MutationConflict"
  | "ClientStateNotFound";

export abstract class ReplicacheError extends Error {
  public declare name: ReplicacheErrorName;

  constructor(message: string) {
    super(message);
  }
}

export abstract class UnrecoverableError extends ReplicacheError {
  public declare name: Exclude<
    ReplicacheErrorName,
    "ReplicacheError" | "ClientStateNotFound"
  >;

  constructor(message: string) {
    super(message);
  }
}

export abstract class RecoverableError extends ReplicacheError {
  public declare name: Extract<ReplicacheErrorName, "ClientStateNotFound">;

  constructor(message: string) {
    super(message);
  }
}

export class BadRequest extends UnrecoverableError {
  public name: Extract<ReplicacheErrorName, "BadRequest">;

  constructor(message = "Bad request") {
    super(message);
    this.name = "BadRequest";
  }
}

export class Unauthorized extends UnrecoverableError {
  public name: Extract<ReplicacheErrorName, "Unauthorized">;

  constructor(message = "Unauthorized") {
    super(message);
    this.name = "Unauthorized";
  }
}

export class MutationConflict extends UnrecoverableError {
  public name: Extract<ReplicacheErrorName, "MutationConflict">;

  constructor(message = "Mutation conflict") {
    super(message);
    this.name = "MutationConflict";
  }
}

export class ClientStateNotFound extends ReplicacheError {
  public name: Extract<ReplicacheErrorName, "ClientStateNotFound">;

  constructor(message = "Client state not found") {
    super(message);
    this.name = "ClientStateNotFound";
  }
}
