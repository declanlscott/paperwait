import * as v from "valibot";

import { HttpError } from "./http";

export { NoSuchKey } from "@aws-sdk/client-s3";
export { ParameterNotFound, ParameterAlreadyExists } from "@aws-sdk/client-ssm";

export class ParametersSecretsExtensionHttpError extends HttpError {
  constructor(...args: ConstructorParameters<typeof HttpError>) {
    super(...args);
    this.name = "ParametersSecretsExtensionHttpError";
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
