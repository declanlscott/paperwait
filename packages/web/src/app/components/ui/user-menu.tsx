import {
  Button as AriaButton,
  composeRenderProps,
} from "react-aria-components";
import { getUserInitials } from "@paperwait/core/utils";
import { Building2, LogOut } from "lucide-react";
import { useSubscribe } from "replicache-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/app/components/ui/primitives/avatar";
import {
  Menu,
  MenuHeader,
  MenuItem,
  MenuPopover,
  MenuSection,
  MenuSeparator,
  MenuTrigger,
} from "~/app/components/ui/primitives/menu";
import { useAuthenticated, useLogout } from "~/app/lib/hooks/auth";
import { useReplicache } from "~/app/lib/hooks/replicache";
import { userMenuTriggerButtonStyles } from "~/shared/styles/components/user-menu";

import type { Organization } from "@paperwait/core/organization";

export function UserMenu() {
  const replicache = useReplicache();

  const { user } = useAuthenticated();

  const org = useSubscribe(replicache, (tx) =>
    tx
      .scan<Organization>({ prefix: "organization" })
      .toArray()
      .then((values) => values.at(0)),
  );

  const logout = useLogout();

  return (
    <MenuTrigger>
      <AriaButton
        className={composeRenderProps("", (className, renderProps) =>
          userMenuTriggerButtonStyles({ ...renderProps, className }),
        )}
      >
        <Avatar>
          <AvatarImage src={`/api/user/${user.id}/photo`} alt={user.name} />

          <AvatarFallback className="text-foreground bg-muted border-primary border-2">
            {getUserInitials(user.name)}
          </AvatarFallback>
        </Avatar>
      </AriaButton>

      <MenuPopover placement="bottom" className="min-w-[8rem]">
        <Menu className="w-56">
          <MenuSection>
            <MenuHeader>
              <div className="flex items-center gap-2">
                <Building2 />

                <div className="flex flex-col space-y-1">
                  <span className="text-sm font-medium leading-none">
                    {org?.name}
                  </span>

                  <span className="text-muted-foreground text-xs leading-none">
                    {org?.slug}
                  </span>
                </div>
              </div>
            </MenuHeader>
          </MenuSection>

          <MenuSeparator />

          <MenuSection>
            <MenuHeader>
              <div className="flex flex-col space-y-1">
                <span className="text-sm font-medium leading-none">
                  {user.name}
                </span>

                <span className="text-muted-foreground text-xs leading-none">
                  {user.email}
                </span>

                <span className="text-muted-foreground/90 text-xs font-thin leading-none">
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
              </div>
            </MenuHeader>
          </MenuSection>

          <MenuSeparator />

          <MenuSection>
            <MenuItem onAction={logout}>
              <LogOut className="text-destructive mr-2 size-4" />

              <span className="text-destructive">Logout</span>
            </MenuItem>
          </MenuSection>
        </Menu>
      </MenuPopover>
    </MenuTrigger>
  );
}
