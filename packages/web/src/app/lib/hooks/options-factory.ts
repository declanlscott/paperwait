import { useMemo } from "react";

import { useApi } from "~/app/lib/hooks/api";

import type { PapercutParameter } from "@paperwait/core/schemas";
import type { MutationOptionsFactory } from "~/app/types";

export function useOptionsFactory() {
  const { client } = useApi();

  // eslint-disable-next-line @typescript-eslint/no-empty-function, react-hooks/exhaustive-deps
  const query = useMemo(() => {}, []);

  const mutation = useMemo(
    () =>
      ({
        papercutCredentials: () => ({
          mutationKey: ["papercut", "credentials"] as const,
          mutationFn: async (json: PapercutParameter) => {
            const response =
              await client.api.integrations.papercut.credentials.$put({
                json,
              });

            if (!response.ok) throw new Error(response.statusText);
          },
        }),
        testConnection: () => ({
          mutationKey: ["papercut", "test"] as const,
          mutationFn: async () => {
            const response =
              await client.api.integrations.papercut.test.$post();

            if (!response.ok) throw new Error(response.statusText);
          },
        }),
        syncAccounts: () => ({
          mutationKey: ["papercut", "accounts", "sync"] as const,
          mutationFn: async () => {
            const response =
              await client.api.integrations.papercut.accounts.$put({
                json: undefined,
              });

            if (!response.ok) throw new Error(response.statusText);
          },
        }),
      }) satisfies MutationOptionsFactory,
    [client],
  );

  return { query, mutation };
}
