import { Link as AriaLink, composeRenderProps } from "react-aria-components";
import { createLazyFileRoute } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import {
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  Breadcrumbs,
  BreadcrumbSeparator,
} from "~/app/components/ui/primitives/breadcrumbs";
import { SettingsLayout } from "~/app/layouts/settings";
import { queryFactory, useQuery } from "~/app/lib/hooks/data";
import { useUser } from "~/app/lib/hooks/user";
import { linksFactory } from "~/app/lib/links";
import { buttonStyles } from "~/styles/components/primitives/button";

export const Route = createLazyFileRoute(
  "/_authenticated/settings_/rooms/$roomId",
)({ component: Component });

function Component() {
  const { roomId } = Route.useParams();
  const room = useQuery(queryFactory.room(roomId));

  const user = useUser();

  return (
    <SettingsLayout
      header={
        <>
          <div className="flex items-center gap-2">
            <AriaLink
              href={{ to: "/settings/rooms" }}
              className={composeRenderProps("", (_, renderProps) =>
                buttonStyles({
                  variant: "ghost",
                  size: "icon",
                  ...renderProps,
                }),
              )}
              aria-label="Back to Rooms"
            >
              <ChevronLeft />
            </AriaLink>

            <h1 className="text-3xl font-semibold">Room Settings</h1>
          </div>

          <Breadcrumbs>
            <BreadcrumbItem>
              <BreadcrumbLink href={{ to: "/settings/rooms" }}>
                Rooms
              </BreadcrumbLink>

              <BreadcrumbSeparator />
            </BreadcrumbItem>

            <BreadcrumbItem>
              <BreadcrumbPage>{room?.name ?? "Room"}</BreadcrumbPage>
            </BreadcrumbItem>
          </Breadcrumbs>
        </>
      }
      links={linksFactory.roomSettings(roomId)[user.profile.role]}
    />
  );
}
