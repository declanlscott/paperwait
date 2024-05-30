export class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

export class BadRequestError extends HttpError {
  constructor(message = "Bad request", statusCode = 400) {
    super(message, statusCode);
    this.name = "BadRequestError";
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

export class NotFoundError extends HttpError {
  constructor(message = "Not found", statusCode = 404) {
    super(message, statusCode);
    this.name = "NotFoundError";
  }
}

export class MethodNotAllowedError extends HttpError {
  constructor(message = "Method not allowed", statusCode = 405) {
    super(message, statusCode);
    this.name = "MethodNotAllowedError";
  }
}

export class ConflictError extends HttpError {
  constructor(message = "Conflict", statusCode = 409) {
    super(message, statusCode);
    this.name = "ConflictError";
  }
}

export class InternalServerError extends HttpError {
  constructor(message = "Internal server error", statusCode = 500) {
    super(message, statusCode);
    this.name = "InternalServerError";
  }
}

export class NotImplementedError extends HttpError {
  constructor(message = "Not implemented", statusCode = 501) {
    super(message, statusCode);
    this.name = "NotImplementedError";
  }
}

export function handlePromiseResult<TValue>(
  result: PromiseSettledResult<TValue>,
) {
  if (result.status === "rejected") {
    console.error(result.reason);

    if (result.reason instanceof HttpError) throw result.reason;

    throw new InternalServerError();
  }

  return result.value;
}
