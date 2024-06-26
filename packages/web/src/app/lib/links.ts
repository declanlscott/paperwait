import type { UserRole } from "@paperwait/core/user";
import type { Links } from "~/app/types";

export const links = {
  settings: {
    administrator: [
      {
        name: "General",
        props: { href: "/settings" },
      },
      {
        name: "Integrations",
        props: { href: "/settings/integrations" },
      },
    ],
    operator: [],
    manager: [],
    customer: [],
  },
} satisfies Record<string, Record<UserRole, Links>>;
