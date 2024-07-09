import { useContext, useEffect } from "react";
import { OverlayTriggerStateContext } from "react-aria-components";
import { enforceRbac } from "@paperwait/core/utils";
import { useNavigate } from "@tanstack/react-router";
import { useAtom } from "jotai";
import {
  Check,
  CircleCheck,
  CircleDashed,
  Home,
  LogOut,
  Settings,
} from "lucide-react";

import { EnforceRbac } from "~/app/components/ui/enforce-rbac";
import { Avatar, AvatarImage } from "~/app/components/ui/primitives/avatar";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/app/components/ui/primitives/command";
import { DialogOverlay } from "~/app/components/ui/primitives/dialog";
import { selectedRoomIdAtom } from "~/app/lib/atoms";
import { useAuthenticated, useLogout } from "~/app/lib/hooks/auth";
import {
  useCommandBar,
  useCommandBarActions,
} from "~/app/lib/hooks/command-bar";
import { queryFactory, useMutator, useQuery } from "~/app/lib/hooks/data";
import { links } from "~/app/lib/links";

import type { Room } from "@paperwait/core/room";
import type { ToOptions } from "@tanstack/react-router";

export function CommandBar() {
  const state = useContext(OverlayTriggerStateContext);

  const { input } = useCommandBar();
  const { getActivePage, popPage } = useCommandBarActions();
  const activePage = getActivePage();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();

        state.toggle();
      }
    };

    document.addEventListener("keydown", down);

    return () => document.removeEventListener("keydown", down);
  }, [state]);

  return (
    <DialogOverlay>
      <CommandDialog
        commandProps={{
          onKeyDown(e) {
            if (activePage.type === "home" || input.length) return;

            if (e.key === "Backspace") {
              e.preventDefault();

              popPage();
            }
          },
        }}
      >
        {activePage.type === "home" && <HomeCommand />}
        {activePage.type === "room" && (
          <RoomCommand roomId={activePage.roomId} />
        )}
      </CommandDialog>
    </DialogOverlay>
  );
}

function HomeCommand() {
  const { user, replicache } = useAuthenticated();

  const state = useContext(OverlayTriggerStateContext);

  const { pushPage } = useCommandBarActions();
  const { input } = useCommandBar();
  const { setInput } = useCommandBarActions();

  const navigate = useNavigate();

  const logout = useLogout();

  const rooms = useQuery(queryFactory.rooms);
  const users = useQuery(queryFactory.users);

  const handleNavigation = async (to: ToOptions) =>
    navigate(to).then(() => state.close());

  const navigationKeywords = ["navigation", "navigate"];

  return (
    <>
      <CommandInput
        placeholder="Type a command or search..."
        autoFocus
        value={input}
        onValueChange={setInput}
      />

      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {links.mainNav[user.role].map((link) => (
            <CommandItem
              key={link.name}
              onSelect={() => handleNavigation(link.props.href)}
              keywords={navigationKeywords}
            >
              <div className="mr-2 size-5">{link.icon}</div>

              <p>
                Jump to <span className="font-medium">{link.name}</span>
              </p>
            </CommandItem>
          ))}

          <CommandItem
            onSelect={() => logout()}
            keywords={[...navigationKeywords, "log out"]}
          >
            <LogOut className="text-destructive mr-2 size-5" />

            <span className="text-destructive">Logout</span>
          </CommandItem>
        </CommandGroup>

        {rooms?.length ? (
          <>
            <CommandSeparator />

            <CommandGroup heading="Rooms">
              {rooms.map((room) => (
                <CommandItem
                  key={room.id}
                  onSelect={() => pushPage({ type: "room", roomId: room.id })}
                  keywords={["rooms", "room"]}
                >
                  <Home className="mr-2 size-5" />

                  <span>{room.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        {users?.length ? (
          <>
            <CommandSeparator />

            <CommandGroup heading="Users">
              {users.map((u) => (
                <CommandItem
                  key={u.id}
                  keywords={["users", "user"]}
                  onSelect={async () => {
                    if (enforceRbac(user, ["administrator", "operator"]))
                      return await handleNavigation({
                        to: "/users/$userId",
                        params: { userId: u.id },
                      });

                    if (enforceRbac(user, ["manager"])) {
                      const customerIds = await replicache.query(
                        queryFactory.managedCustomerIds(user.id),
                      );

                      if (customerIds.includes(u.id))
                        return await handleNavigation({
                          to: "/users/$userId",
                          params: { userId: u.id },
                        });
                    }
                  }}
                >
                  <Avatar className="mr-3 size-8">
                    <AvatarImage src={`/api/user/${u.id}/photo`} />
                  </Avatar>

                  <span>{u.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        <CommandSeparator />

        <CommandGroup heading="Scope">
          {links.settings[user.role].map((link) => (
            <CommandItem
              key={link.name}
              onSelect={() => handleNavigation(link.props.href)}
              keywords={["scope", "settings"]}
            >
              <Settings className="mr-2 size-5" />

              <p>
                Jump to <span className="font-medium">Settings</span>{" "}
                {link.name}
              </p>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </>
  );
}

type RoomCommandProps = {
  roomId: Room["id"];
};
function RoomCommand(props: RoomCommandProps) {
  const state = useContext(OverlayTriggerStateContext);

  const { input } = useCommandBar();
  const { setInput, popPage } = useCommandBarActions();

  const [, setSelectedRoomId] = useAtom(selectedRoomIdAtom);

  const { updateRoom } = useMutator();

  const room = useQuery(queryFactory.room(props.roomId));

  function selectRoom() {
    setSelectedRoomId(props.roomId);

    state.close();
  }

  async function updateRoomStatus(status: Room["status"]) {
    await updateRoom({
      id: props.roomId,
      status,
      updatedAt: new Date().toISOString(),
    });

    state.close();
  }

  return (
    <>
      <CommandInput
        placeholder={`Room: ${room?.name}`}
        autoFocus
        value={input}
        onValueChange={setInput}
        back={{ buttonProps: { onPress: () => popPage() } }}
      />

      <CommandList>
        <CommandEmpty>No rooms found.</CommandEmpty>

        <CommandGroup heading="Room">
          {room && (
            <>
              <CommandItem onSelect={() => selectRoom()}>
                <Check className="mr-2 size-5" />

                <p>
                  <span className="font-medium">Select</span> {room.name}
                </p>
              </CommandItem>

              <EnforceRbac roles={["administrator", "operator"]}>
                {room.status === "draft" ? (
                  <CommandItem onSelect={() => updateRoomStatus("published")}>
                    <CircleCheck className="mr-2 size-5" />

                    <p>
                      <span className="font-medium">Publish</span> {room.name}
                    </p>
                  </CommandItem>
                ) : (
                  <CommandItem onSelect={() => updateRoomStatus("draft")}>
                    <CircleDashed className="mr-2 size-5" />

                    <p>
                      <span className="font-medium">Unpublish</span> {room.name}
                    </p>
                  </CommandItem>
                )}
              </EnforceRbac>
            </>
          )}
        </CommandGroup>
      </CommandList>
    </>
  );
}
