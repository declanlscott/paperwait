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
  public name: HttpErrorName;
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
}

export class BadRequest extends HttpError {
  public name: Extract<HttpErrorName, "BadRequest">;

  constructor(message = "Bad request") {
    super(message, 400);
    this.name = "BadRequest";
  }
}

export class Unauthorized extends HttpError {
  public name: Extract<HttpErrorName, "Unauthorized">;

  constructor(message = "Unauthorized") {
    super(message, 401);
    this.name = "Unauthorized";
  }
}

export class Forbidden extends HttpError {
  public name: Extract<HttpErrorName, "Forbidden">;

  constructor(message = "Forbidden") {
    super(message, 403);
    this.name = "Forbidden";
  }
}

export class NotFound extends HttpError {
  public name: Extract<HttpErrorName, "NotFound">;

  constructor(message = "Not found") {
    super(message, 404);
    this.name = "NotFound";
  }
}

export class MethodNotAllowed extends HttpError {
  public name: Extract<HttpErrorName, "MethodNotAllowed">;

  constructor(message = "Method not allowed") {
    super(message, 405);
    this.name = "MethodNotAllowed";
  }
}

export class RequestTimeout extends HttpError {
  public name: Extract<HttpErrorName, "RequestTimeout">;

  constructor(message = "Request timeout") {
    super(message, 408);
    this.name = "RequestTimeout";
  }
}

export class Conflict extends HttpError {
  public name: Extract<HttpErrorName, "Conflict">;

  constructor(message = "Conflict") {
    super(message, 409);
    this.name = "Conflict";
  }
}

export class TooManyRequests extends HttpError {
  public name: Extract<HttpErrorName, "TooManyRequests">;

  constructor(message = "Too many requests") {
    super(message, 429);
    this.name = "TooManyRequests";
  }
}

export class InternalServerError extends HttpError {
  public name: Extract<HttpErrorName, "InternalServerError">;

  constructor(message = "Internal server error") {
    super(message, 500);
    this.name = "InternalServerError";
  }
}

export class NotImplemented extends HttpError {
  public name: Extract<HttpErrorName, "NotImplemented">;

  constructor(message = "Not implemented") {
    super(message, 501);
    this.name = "NotImplemented";
  }
}
