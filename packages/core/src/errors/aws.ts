import * as v from "valibot";

export { NoSuchKey } from "@aws-sdk/client-s3";
export { ParameterNotFound, ParameterAlreadyExists } from "@aws-sdk/client-ssm";

export class ParametersSecretsExtensionHttpError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "ParametersSecretsExtensionHttpError";
    this.statusCode = statusCode;
  }
}

export class ParametersSecretsExtensionJsonParseError<
  TSchema extends v.GenericSchema,
> extends v.ValiError<TSchema> {
  constructor(...args: ConstructorParameters<typeof v.ValiError<TSchema>>) {
    super(...args);
    this.name = "ParametersSecretsExtensionJsonParseError";
  }
}
