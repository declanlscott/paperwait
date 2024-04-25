import { HOST } from "@paperwait/core/constants";
import ky, { HTTPError as kyHttpError } from "ky";
import { Resource } from "sst";

import { HttpError, InternalServerError } from "../errors";

export async function poke(entity: string) {
  try {
    await ky.post(
      `http${Resource.IsDev ? `://${HOST.REALTIME.DEV}` : `s://${HOST.REALTIME.PROD}`}/party/${entity}`,
    );
  } catch (e) {
    console.error(e);

    if (e instanceof kyHttpError) {
      throw new HttpError(e.message, e.response.status);
    }

    throw new InternalServerError();
  }
}
