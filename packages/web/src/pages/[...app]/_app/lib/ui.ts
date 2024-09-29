import { fn } from "@paperwait/core/utils/helpers";
import { valibot as v } from "@paperwait/core/utils/libs";

export const collectionItem = (name: string) => ({ name });

export const onSelectionChange = <
  TKeys extends Array<string> | Readonly<Array<string>>,
  TSchema extends v.PicklistSchema<TKeys, "">,
  TOnChange extends (output: v.InferOutput<TSchema>) => ReturnType<TOnChange>,
>(
  keys: TKeys,
  onChange: TOnChange,
) => fn(v.picklist(keys), onChange);
