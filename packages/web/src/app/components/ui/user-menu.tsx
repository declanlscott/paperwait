import {
  Button as AriaButton,
  composeRenderProps,
} from "react-aria-components";
import { getUserInitials } from "@paperwait/core/utils";
import { Building2, LogOut } from "lucide-react";

import { EnforceRbac } from "~/app/components/ui/enforce-rbac";
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
import { queryFactory, useQuery } from "~/app/lib/hooks/data";
import { userMenuTriggerButtonStyles } from "~/shared/styles/components/user-menu";

export function UserMenu() {
  const { user } = useAuthenticated();

  const org = useQuery(queryFactory.organization);

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

                    <EnforceRbac roles={["administrator"]}>
                      {" "}
                      ({org?.status})
                    </EnforceRbac>
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

                <span className="text-muted-foreground/90 text-xs font-thin capitalize leading-none">
                  {user.role}
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
