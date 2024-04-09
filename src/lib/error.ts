export class MissingParameterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MissingParameterError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}
