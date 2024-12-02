import { Resource } from "sst";
import * as v from "valibot";

import { Api } from "../api";
import { Ssm, Sts } from "../utils/aws";
import { Constants } from "../utils/constants";
import { HttpError } from "../utils/errors";

export namespace Documents {
  export async function setMimeTypes(mimeTypes: Array<string>) {
    const ssm = new Ssm.Client({
      credentials: await Sts.getAssumeRoleCredentials(new Sts.Client(), {
        type: "name",
        accountId: await Api.getAccountId(),
        roleName: Resource.Aws.tenant.putParametersRole.name,
        roleSessionName: "SetDocumentsMimeTypes",
      }),
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
    const ssm = new Ssm.Client({
      credentials: await Sts.getAssumeRoleCredentials(new Sts.Client(), {
        type: "name",
        accountId: await Api.getAccountId(),
        roleName: Resource.Aws.tenant.putParametersRole.name,
        roleSessionName: "SetDocumentsSizeLimit",
      }),
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
