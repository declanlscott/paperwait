export type HttpErrorName =
  | "HttpError"
  | "BadRequest"
  | "Unauthorized"
  | "Forbidden"
  | "NotFound"
  | "MethodNotAllowed"
  | "RequestTimeout"
  | "Conflict"
  | "TooManyRequests"
  | "InternalServerError"
  | "NotImplemented";

export class HttpError extends Error {
  public declare readonly name: HttpErrorName;
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class BadRequest extends HttpError {
  public readonly name = "BadRequest";
  public readonly statusCode = 400;

  constructor(message = "Bad request") {
    super(message, 400);
  }
}

export class Unauthorized extends HttpError {
  public readonly name = "Unauthorized";
  public readonly statusCode = 401;

  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

export class Forbidden extends HttpError {
  public readonly name = "Forbidden";
  public readonly statusCode = 403;

  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

export class NotFound extends HttpError {
  public readonly name = "NotFound";
  public readonly statusCode = 404;

  constructor(message = "Not found") {
    super(message, 404);
  }
}

export class MethodNotAllowed extends HttpError {
  public readonly name = "MethodNotAllowed";
  public readonly statusCode = 405;

  constructor(message = "Method not allowed") {
    super(message, 405);
  }
}

export class RequestTimeout extends HttpError {
  public readonly name = "RequestTimeout";
  public readonly statusCode = 408;

  constructor(message = "Request timeout") {
    super(message, 408);
  }
}

export class Conflict extends HttpError {
  public readonly name = "Conflict";
  public readonly statusCode = 409;

  constructor(message = "Conflict") {
    super(message, 409);
  }
}

export class TooManyRequests extends HttpError {
  public readonly name = "TooManyRequests";
  public readonly statusCode = 429;

  constructor(message = "Too many requests") {
    super(message, 429);
  }
}

export class InternalServerError extends HttpError {
  public readonly name = "InternalServerError";
  public readonly statusCode = 500;

  constructor(message = "Internal server error") {
    super(message, 500);
    this.name = "InternalServerError";
  }
}

export class NotImplemented extends HttpError {
  public readonly name = "NotImplemented";
  public readonly statusCode = 501;

  constructor(message = "Not implemented") {
    super(message, 501);
  }
}
