export type UnrecoverableErrorName =
  | "BadRequest"
  | "Unauthorized"
  | "MutationConflict";

export type RecoverableErrorName = "ClientStateNotFound";

export type ReplicacheErrorName = UnrecoverableErrorName | RecoverableErrorName;

export abstract class ReplicacheError extends Error {
  public declare readonly name: ReplicacheErrorName;

  constructor(message: string) {
    super(message);
  }
}

export abstract class UnrecoverableError extends ReplicacheError {
  public declare readonly name: UnrecoverableErrorName;

  constructor(message: string) {
    super(message);
  }
}

export abstract class RecoverableError extends ReplicacheError {
  public declare readonly name: RecoverableErrorName;

  constructor(message: string) {
    super(message);
  }
}

export class BadRequest extends UnrecoverableError {
  public readonly name = "BadRequest";

  constructor(message = "Bad request") {
    super(message);
  }
}

export class Unauthorized extends UnrecoverableError {
  public readonly name = "Unauthorized";

  constructor(message = "Unauthorized") {
    super(message);
  }
}

export class MutationConflict extends UnrecoverableError {
  public readonly name = "MutationConflict";

  constructor(message = "Mutation conflict") {
    super(message);
  }
}

export class ClientStateNotFound extends ReplicacheError {
  public readonly name = "ClientStateNotFound";

  constructor(message = "Client state not found") {
    super(message);
  }
}
