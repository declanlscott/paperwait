export class NonExhaustiveValueError extends Error {
  constructor(value: never) {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    super(`Non-exhaustive value: ${value}`);
  }
}
