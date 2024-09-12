import * as v from "valibot";

export { NoSuchKey } from "@aws-sdk/client-s3";
export { ParameterNotFound, ParameterAlreadyExists } from "@aws-sdk/client-ssm";

export class ParametersSecretsExtensionHttpError extends Error {
  public readonly name = "ParametersSecretsExtensionHttpError";
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class ParametersSecretsExtensionJsonParseError<
  TSchema extends v.GenericSchema,
> extends v.ValiError<TSchema> {
  public readonly name = "ParametersSecretsExtensionJsonParseError";

  constructor(...args: ConstructorParameters<typeof v.ValiError<TSchema>>) {
    super(...args);
  }
}
