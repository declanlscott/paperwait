import { registrationSchema } from "@paperwait/core/organizations/shared";
import { remeda as R, valibot as v } from "@paperwait/core/utils/libs";

import type { Registration } from "@paperwait/core/organizations/shared";

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
