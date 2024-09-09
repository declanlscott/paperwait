import { createLazyFileRoute } from "@tanstack/react-router";

import { SettingsLayout } from "~/app/layouts/settings";
import { useAuthenticated } from "~/app/lib/hooks/auth";
import { linksFactory } from "~/app/lib/links";

export const Route = createLazyFileRoute("/_authenticated/settings")({
  component: Component,
});

function Component() {
  const { user } = useAuthenticated();

  return <SettingsLayout links={linksFactory.settings()[user.role]} />;
}
