import { queryOptions } from "@tanstack/react-query";

import { useApi } from "~/app/lib/hooks/api";

import type { PapercutParameter } from "@paperwait/core/schemas";
import type { MutationOptionsFactory } from "~/app/types";

export function useOptionsFactory() {
  const { client } = useApi();

  const query = {
    syncPapercutAccounts: () =>
      queryOptions({
        queryKey: ["papercut", "accounts", "sync"] as const,
        queryFn: () => client.api.papercut.accounts.$put({ json: undefined }),
      }),
  };

  const mutation = {
    papercutCredentials: () => ({
      mutationKey: ["papercut", "credentials"] as const,
      mutationFn: (json: PapercutParameter) =>
        client.api.papercut.credentials.$put({ json }),
    }),
  } satisfies MutationOptionsFactory;

  return { query, mutation };
}
