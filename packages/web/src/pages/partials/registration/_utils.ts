import * as R from "@paperwait/core/libs/remeda";
import * as v from "@paperwait/core/libs/valibot";
import { registrationSchema } from "@paperwait/core/tenants/shared";

import type { Registration } from "@paperwait/core/tenants/shared";

export const getFormInput = (formData: FormData) =>
  R.keys(registrationSchema.entries).reduce(
    (fields, key) => {
      const value = formData.get(key)?.toString();

      fields[key] = value !== "" ? value : undefined;

      return fields;
    },
    {} as Record<keyof Registration, string | undefined>,
  );

export const getFormErrors = <TSchema extends v.GenericSchema>(
  issues: Array<v.InferIssue<TSchema>>,
) =>
  issues.reduce(
    (errors, issue) => {
      const path = v.getDotPath<TSchema>(issue);

      if (path) errors[path] = [...(errors[path] ?? []), issue.message];

      return errors;
    },
    {} as Partial<Record<v.IssueDotPath<TSchema>, Array<string>>>,
  );
