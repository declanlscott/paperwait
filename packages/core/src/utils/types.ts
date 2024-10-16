export type StartsWith<
  TPrefix extends string,
  TValue extends string,
> = TValue extends `${TPrefix}${string}` ? TValue : never;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyError = new (...args: Array<any>) => Error;

export type CustomError<TError extends AnyError> = {
  Error: TError;
  args: ConstructorParameters<TError>;
};

export type InferCustomError<TCustomError> =
  TCustomError extends CustomError<infer TError> ? CustomError<TError> : never;
