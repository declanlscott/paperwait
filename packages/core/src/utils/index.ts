import * as R from "remeda";

import type { User } from "lucia";
import type { ApplicationError } from "../errors/application";
import type { HttpError } from "../errors/http";
import type { PrefixedRecord } from "../types/utils";
import type { UserRole } from "../user/user.sql";

export function enforceRbac<TCustomError extends HttpError | ApplicationError>(
  user: User,
  roles: Array<UserRole>,
  CustomError?: new () => TCustomError,
) {
  const hasAccess = roles.includes(user.role);

  if (!hasAccess) {
    console.log(`Role-based access control failed for user id "${user.id}".`);

    if (CustomError) throw new CustomError();
  }

  return hasAccess;
}

export function createPrefixedRecord<
  TKey extends string,
  TDelimiter extends string,
  TPrefix extends string,
>(
  prefix: TPrefix,
  delimiter: TDelimiter,
  keys: Array<TKey>,
): PrefixedRecord<TPrefix, TDelimiter, TKey> {
  return keys.reduce(
    (prefixedRecord, key) => {
      prefixedRecord[key] = `${prefix}${delimiter}${key}`;

      return prefixedRecord;
    },
    {} as PrefixedRecord<TPrefix, TDelimiter, TKey>,
  );
}

export function getUserInitials(name: string) {
  if (!name) return "";

  const splitName = name.split(" ");
  const firstInitial = splitName[0].charAt(0).toUpperCase();

  if (splitName.length === 1) return firstInitial;

  const lastInitial = splitName[splitName.length - 1].charAt(0).toUpperCase();

  return `${firstInitial}${lastInitial}`;
}

export const isUniqueByName = <TInput extends Array<{ name: string }>>(
  input: TInput,
) =>
  R.pipe(
    input,
    R.uniqueBy(({ name }) => name),
    R.length(),
    R.isDeepEqual(input.length),
  );

export const formatPascalCase = (value: string) =>
  value.replace(/([a-z])([A-Z])/g, "$1 $2");
