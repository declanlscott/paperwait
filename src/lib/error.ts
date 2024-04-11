export class HTTPError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "HTTPError";
    this.statusCode = statusCode;
  }
}

export class MissingParameterError extends HTTPError {
  constructor(message: string, statusCode = 400) {
    super(message, statusCode);
    this.name = "MissingParameterError";
  }
}

export class NotFoundError extends HTTPError {
  constructor(message: string, statusCode = 404) {
    super(message, statusCode);
    this.name = "NotFoundError";
  }
}

export class NotImplementedError extends HTTPError {
  constructor(message: string, statusCode = 501) {
    super(message, statusCode);
    this.name = "NotImplementedError";
  }
}

export class UnauthorizedError extends HTTPError {
  constructor(message = "Unauthorized", statusCode = 401) {
    super(message, statusCode);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends HTTPError {
  constructor(message = "Forbidden", statusCode = 403) {
    super(message, statusCode);
    this.name = "ForbiddenError";
  }
}
