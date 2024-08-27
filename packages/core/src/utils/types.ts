import { UserRole } from "../constants/tuples";

import type * as v from "valibot";

export type PrefixedRecord<
  TPrefix extends string,
  TDelimiter extends string,
  TKey extends string,
> = {
  [Key in TKey]: `${TPrefix}${TDelimiter}${Key}`;
};

export type StartsWith<
  TPrefix extends string,
  TValue extends string,
> = TValue extends `${TPrefix}${string}` ? TValue : never;

// export type DomainMutatorMetadata =
//   Record<
//     string,
//     {
//       name: string;
//       argsSchema: () => TSchema;
//       rbac: Readonly<Array<UserRole>>;
//     }
//   >;

export type MutatorsMetadata = Readonly<
  Array<
    [
      string,
      {
        argsSchema: v.GenericSchema;
        rbac: Array<UserRole>;
      },
    ]
  >
>;
