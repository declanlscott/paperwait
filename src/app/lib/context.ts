import { createContext } from "react";

import type { ClientResource } from "~/lib/client-resource";

export const SstResourceContext = createContext<ClientResource | null>(null);
