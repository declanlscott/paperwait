import { Resource } from "sst";
import * as v from "valibot";

import { Api } from "../api";
import { Ssm, Sts } from "../utils/aws";
import { Constants } from "../utils/constants";
import { HttpError } from "../utils/errors";

export namespace Documents {
  export async function setMimeTypes(mimeTypes: Array<string>) {
    const accountId = await Api.getAccountId();

    const sts = new Sts.Client();

    const { Credentials } = await Sts.assumeRole(sts, {
      RoleArn: `arn:aws:iam::${accountId}:role/${Resource.Aws.tenant.putParametersRole.name}`,
      RoleSessionName: "SetDocumentsMimeTypes",
      DurationSeconds: 60,
    });

    if (
      !Credentials?.AccessKeyId ||
      !Credentials.SecretAccessKey ||
      !Credentials.SessionToken
    )
      throw new Error("Missing ssm credentials");

    const ssm = new Ssm.Client({
      credentials: {
        accessKeyId: Credentials.AccessKeyId,
        secretAccessKey: Credentials.SecretAccessKey,
        sessionToken: Credentials.SessionToken,
      },
    });

    await Ssm.putParameter(ssm, {
      Name: Constants.DOCUMENTS_MIME_TYPES_PARAMETER_NAME,
      Value: JSON.stringify(mimeTypes),
      Type: "StringList",
    });
  }

  export async function getMimeTypes() {
    const res = await Api.send(
      `/parameters${Constants.DOCUMENTS_MIME_TYPES_PARAMETER_NAME}`,
      { method: "GET" },
    );
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

    return v.parse(v.array(v.string()), await res.json());
  }

  export async function setSizeLimit(byteSize: number) {
    const accountId = await Api.getAccountId();

    const sts = new Sts.Client();

    const { Credentials } = await Sts.assumeRole(sts, {
      RoleArn: `arn:aws:iam::${accountId}:role/${Resource.Aws.tenant.putParametersRole.name}`,
      RoleSessionName: "SetDocumentsSizeLimit",
      DurationSeconds: 60,
    });

    if (
      !Credentials?.AccessKeyId ||
      !Credentials.SecretAccessKey ||
      !Credentials.SessionToken
    )
      throw new Error("Missing ssm credentials");

    const ssm = new Ssm.Client({
      credentials: {
        accessKeyId: Credentials.AccessKeyId,
        secretAccessKey: Credentials.SecretAccessKey,
        sessionToken: Credentials.SessionToken,
      },
    });

    await Ssm.putParameter(ssm, {
      Name: Constants.DOCUMENTS_SIZE_LIMIT_PARAMETER_NAME,
      Value: byteSize.toString(),
      Type: "String",
    });
  }

  export async function getSizeLimit() {
    const res = await Api.send(
      `/parameters${Constants.DOCUMENTS_SIZE_LIMIT_PARAMETER_NAME}`,
      { method: "GET" },
    );
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

    return v.parse(v.number(), await res.text());
  }
}
