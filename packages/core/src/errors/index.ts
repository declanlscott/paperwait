import { NeonDbError } from "@neondatabase/serverless";

export class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

export class MissingParameterError extends HttpError {
  constructor(message: string, statusCode = 400) {
    super(message, statusCode);
    this.name = "MissingParameterError";
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string, statusCode = 404) {
    super(message, statusCode);
    this.name = "NotFoundError";
  }
}

export class NotImplementedError extends HttpError {
  constructor(message: string, statusCode = 501) {
    super(message, statusCode);
    this.name = "NotImplementedError";
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "Unauthorized", statusCode = 401) {
    super(message, statusCode);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "Forbidden", statusCode = 403) {
    super(message, statusCode);
    this.name = "ForbiddenError";
  }
}

export class TooManyTransactionRetriesError extends HttpError {
  constructor(
    message = "Tried to execute transaction too many times, giving up.",
    statusCode = 500,
  ) {
    super(message, statusCode);
    this.name = "TooManyTransactionRetriesError";
  }
}

export class MethodNotAllowedError extends HttpError {
  constructor(message = "Method not allowed", statusCode = 405) {
    super(message, statusCode);
    this.name = "MethodNotAllowedError";
  }
}

export class InternalServerError extends HttpError {
  constructor(message = "Internal Server Error", statusCode = 500) {
    super(message, statusCode);
    this.name = "InternalServerError";
  }
}

export class DatabaseError extends NeonDbError {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
  }
}
