import { createLazyFileRoute, Outlet } from "@tanstack/react-router";

import { SideNav } from "~/app/components/ui/side-nav";
import { useAuthenticated } from "~/app/lib/hooks/auth";
import { links } from "~/app/lib/links";

export const Route = createLazyFileRoute("/_authenticated/settings")({
  component: Component,
});

function Component() {
  const { user } = useAuthenticated();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-10">
      <div className="mx-auto grid w-full max-w-6xl gap-2">
        <h1 className="text-3xl font-semibold">Settings</h1>
      </div>

      <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
        <SideNav links={links.settings[user.role]} />

        <Outlet />
      </div>
    </div>
  );
}
