import { createLazyFileRoute } from "@tanstack/react-router";

import { SettingsLayout } from "~/app/layouts/settings";
import { useUser } from "~/app/lib/hooks/user";
import { linksFactory } from "~/app/lib/links";

export const Route = createLazyFileRoute("/_authenticated/settings")({
  component: Component,
});

function Component() {
  const user = useUser();

  return <SettingsLayout links={linksFactory.settings()[user.profile.role]} />;
}
