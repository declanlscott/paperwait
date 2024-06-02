export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationError";
  }
}

export class InvalidUserRoleError extends ApplicationError {
  constructor(message = "Invalid user role") {
    super(message);
    this.name = "InvalidUserRoleError";
  }
}

export class OrderAccessDeniedError extends ApplicationError {
  constructor(message = "Order access denied") {
    super(message);
    this.name = "OrderAccessDeniedError";
  }
}
