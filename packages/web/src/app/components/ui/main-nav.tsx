import { Link as AriaLink, composeRenderProps } from "react-aria-components";
import { getUserInitials } from "@paperwait/core/utils";
import { useRouterState } from "@tanstack/react-router";
import { useAtom } from "jotai/react";
import { useSubscribe } from "replicache-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "~/app/components/ui/primitives/avatar";
import {
  Combobox,
  ComboboxCollection,
  ComboboxInput,
  ComboboxItem,
  ComboboxLabel,
  ComboboxListBox,
  ComboboxPopover,
  ComboboxSection,
} from "~/app/components/ui/primitives/combobox";
import { selectedRoomIdAtom } from "~/app/lib/atoms";
import { useAuthed, useLogout } from "~/app/lib/hooks/auth";
import { useReplicache } from "~/app/lib/hooks/replicache";
import { useSlot } from "~/app/lib/hooks/slot";
import { linkStyles } from "~/shared/styles/components/main-nav";

import type { ComponentProps } from "react";
import type { Room } from "@paperwait/core/room";

export function MainNav() {
  const { logo } = useSlot();

  const logout = useLogout();

  const replicache = useReplicache();

  const rooms = useSubscribe(replicache, async (tx) =>
    tx.scan<Room>({ prefix: "room/" }).toArray(),
  );

  const [selectedRoomId, setSelectedRoomId] = useAtom(selectedRoomIdAtom);

  const { user } = useAuthed();

  return (
    <div className="hidden flex-col md:flex">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <nav className="flex items-center space-x-4 lg:space-x-6">
            <a href="/" className="flex h-11 w-9 items-center overflow-hidden">
              {logo}
            </a>

            <div className="flex">
              <Combobox
                aria-label="Select Room"
                onSelectionChange={setSelectedRoomId}
                defaultSelectedKey={selectedRoomId ?? undefined}
              >
                <ComboboxInput
                  placeholder="Select a room..."
                  className="w-32"
                />

                <ComboboxPopover>
                  <ComboboxListBox>
                    <ComboboxSection>
                      <ComboboxLabel separator>Rooms</ComboboxLabel>

                      <ComboboxCollection items={rooms}>
                        {(room) => (
                          <ComboboxItem
                            textValue={room.name}
                            id={room.id}
                            key={room.id}
                          >
                            {room.name}
                          </ComboboxItem>
                        )}
                      </ComboboxCollection>
                    </ComboboxSection>
                  </ComboboxListBox>
                </ComboboxPopover>
              </Combobox>
            </div>

            <ul className="flex items-center">
              <li>
                <Link href="/dashboard">Dashboard</Link>
              </li>

              <li>
                <Link href="/settings">Settings</Link>
              </li>

              <li>
                <Link onPress={logout}>Logout</Link>
              </li>
            </ul>

            <Avatar>
              <AvatarImage src={`/api/user/${user.id}/photo`} />
              <AvatarFallback>{getUserInitials(user.name)}</AvatarFallback>
            </Avatar>
          </nav>
        </div>
      </div>
    </div>
  );
}

export type LinkProps = ComponentProps<typeof AriaLink>;
export function Link(props: LinkProps) {
  const { href } = useRouterState({
    select: (state) => state.location,
  });

  const isActive = props.href === href;

  return (
    <AriaLink
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        linkStyles({ ...renderProps, isActive, className }),
      )}
    />
  );
}
