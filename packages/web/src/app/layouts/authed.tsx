import { Link } from "react-aria-components";
import { formatChannel } from "@paperwait/core/realtime";
import { Outlet } from "@tanstack/react-router";
import { useAtom } from "jotai/react";
import { useSubscribe } from "replicache-react";

import { AuthedProvider } from "~/app/components/providers/auth";
import { ReplicacheProvider } from "~/app/components/providers/replicache";
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
import { useRealtime } from "~/app/lib/hooks/realtime";
import { useReplicache } from "~/app/lib/hooks/replicache";
import { useSlot } from "~/app/lib/hooks/slot";

import type { PropsWithChildren } from "react";
import type { Room } from "@paperwait/core/room";

export function AuthedLayout() {
  return (
    <AuthedProvider>
      <ReplicacheProvider>
        <Realtime>
          <Nav />

          <Outlet />
        </Realtime>
      </ReplicacheProvider>
    </AuthedProvider>
  );
}

function Realtime(props: PropsWithChildren) {
  const { user } = useAuthed();

  useRealtime({ channel: formatChannel("org", user.orgId) });
  useRealtime({ channel: formatChannel("user", user.id) });

  return props.children;
}

function Nav() {
  const logout = useLogout();

  const { logo } = useSlot();

  const replicache = useReplicache();

  const rooms = useSubscribe(replicache, async (tx) =>
    tx.scan<Room>({ prefix: "room/" }).toArray(),
  );

  const [selectedRoomId, setSelectedRoomId] = useAtom(selectedRoomIdAtom);

  return (
    <nav>
      <a href="/" className="flex h-12 w-10 items-center overflow-hidden">
        {logo}
      </a>

      <div className="flex">
        <Combobox
          aria-label="Select Room"
          onSelectionChange={setSelectedRoomId}
          defaultSelectedKey={selectedRoomId ?? undefined}
        >
          <ComboboxInput placeholder="Select a room..." />

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

      <ul>
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
    </nav>
  );
}
