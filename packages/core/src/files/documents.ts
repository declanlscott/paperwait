import * as v from "valibot";

import { Api } from "../api";
import { Ssm } from "../utils/aws";
import { Constants } from "../utils/constants";
import { HttpError } from "../utils/errors";

export namespace Documents {
  export const setMimeTypes = async (mimeTypes: Array<string>) =>
    Ssm.putParameter({
      Name: Constants.DOCUMENTS_MIME_TYPES_PARAMETER_NAME,
      Value: JSON.stringify(mimeTypes),
      Type: "StringList",
    });

  export async function getMimeTypes() {
    const res = await Api.send(
      `/parameters${Constants.DOCUMENTS_MIME_TYPES_PARAMETER_NAME}`,
      { method: "GET" },
    );
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

    return v.parse(v.array(v.string()), await res.json());
  }

  export const setSizeLimit = async (byteSize: number) =>
    Ssm.putParameter({
      Name: Constants.DOCUMENTS_SIZE_LIMIT_PARAMETER_NAME,
      Value: byteSize.toString(),
      Type: "String",
    });

  export async function getSizeLimit() {
    const res = await Api.send(
      `/parameters${Constants.DOCUMENTS_SIZE_LIMIT_PARAMETER_NAME}`,
      { method: "GET" },
    );
    if (!res.ok) throw new HttpError.Error(res.statusText, res.status);

    return v.parse(v.number(), await res.text());
  }
}
