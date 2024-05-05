import { array, boolean, literal, object, string, variant } from "valibot";

import { xmlRpcMethod } from ".";

import type { Output } from "valibot";

export const isUserExistsOutputSchema = object({
  methodName: literal(xmlRpcMethod.isUserExists),
  value: boolean(),
});

export const listUserSharedAccountsOutputSchema = object({
  methodName: literal(xmlRpcMethod.listUserSharedAccounts),
  value: array(string()),
});

export const adjustSharedAccountAccountBalanceOutputSchema = object({
  methodName: literal(xmlRpcMethod.adjustSharedAccountAccountBalance),
  value: boolean(),
});

export const xmlRpcOutputSchema = variant("methodName", [
  isUserExistsOutputSchema,
  listUserSharedAccountsOutputSchema,
  adjustSharedAccountAccountBalanceOutputSchema,
]);

export type XmlRpcOutput = Output<typeof xmlRpcOutputSchema>;
