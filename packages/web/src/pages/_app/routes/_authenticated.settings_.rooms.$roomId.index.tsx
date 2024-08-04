import { useState } from "react";
import { RoomStatus } from "@paperwait/core/room";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { Lock, LockOpen, Pencil } from "lucide-react";

import { Button } from "~/app/components/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "~/app/components/ui/primitives/card";
import { Input } from "~/app/components/ui/primitives/input";
import {
  Select,
  SelectItem,
  SelectListBox,
  SelectPopover,
} from "~/app/components/ui/primitives/select";
import { queryFactory, useMutator, useQuery } from "~/app/lib/hooks/data";
import { collectionItem, onSelectionChange } from "~/app/lib/ui";
import { cardStyles } from "~/styles/components/primitives/card";
import { labelStyles } from "~/styles/components/primitives/field";
import { inputStyles } from "~/styles/components/primitives/input";

export const Route = createFileRoute("/_authenticated/settings/rooms/$roomId/")(
  {
    beforeLoad: ({ context }) =>
      context.authStore.actions.authorizeRoute(context.user, [
        "administrator",
        "operator",
      ]),
    loader: async ({ context, params }) => {
      const initialRoom = await context.replicache.query(
        queryFactory.room(params.roomId),
      );
      if (!initialRoom) throw notFound();

      return { initialRoom };
    },
    component: Component,
  },
);

function Component() {
  return (
    <div className="grid gap-6">
      <RoomCard />
    </div>
  );
}

function RoomCard() {
  const { roomId } = Route.useParams();
  const { initialRoom } = Route.useLoaderData();

  const room = useQuery(queryFactory.room(roomId), {
    defaultData: initialRoom,
  });

  const [isLocked, setIsLocked] = useState(true);
  const [name, setName] = useState(() => room?.name);

  const { updateRoom } = useMutator();

  async function mutateName() {
    if (room && name && name !== room.name)
      await updateRoom({
        id: room.id,
        name,
        updatedAt: new Date().toISOString(),
      });
  }

  return (
    <Card>
      <CardHeader className="flex-row justify-between gap-4 space-y-0">
        <div className="flex flex-col space-y-1.5">
          {isLocked ? (
            <h3
              className={inputStyles({
                className: cardStyles().title({
                  className: "border-transparent",
                }),
              })}
            >
              {room?.name}
            </h3>
          ) : (
            <Input
              value={name ?? ""}
              onChange={(e) => setName(e.target.value)}
              onBlur={mutateName}
              className={cardStyles().title()}
            />
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onPress={() => setIsLocked((isLocked) => !isLocked)}
        >
          {isLocked ? (
            <Lock className="size-5" />
          ) : (
            <LockOpen className="size-5" />
          )}
        </Button>
      </CardHeader>

      <CardContent>
        <RoomStatusSelect />
      </CardContent>
    </Card>
  );
}

function RoomStatusSelect() {
  const { roomId } = Route.useParams();
  const { initialRoom } = Route.useLoaderData();

  const room = useQuery(queryFactory.room(roomId), {
    defaultData: initialRoom,
  });

  const { updateRoom } = useMutator();

  async function mutate(status: RoomStatus) {
    if (room && status !== room.status)
      await updateRoom({
        id: room.id,
        status,
        updatedAt: new Date().toISOString(),
      });
  }

  return (
    <div className="flex justify-between gap-4">
      <div>
        <span className={labelStyles()}>Status</span>

        <CardDescription>{`This room is currently "${room?.status ?? ""}".`}</CardDescription>
      </div>

      <Select
        aria-label="status"
        selectedKey={room?.status}
        onSelectionChange={onSelectionChange(RoomStatus.enumValues, mutate)}
      >
        <Button>
          <Pencil className="mr-2 size-5" />
          Change Status
        </Button>

        <SelectPopover>
          <SelectListBox items={RoomStatus.enumValues.map(collectionItem)}>
            {(item) => (
              <SelectItem
                id={item.name}
                textValue={item.name}
                className="capitalize"
              >
                {item.name}
              </SelectItem>
            )}
          </SelectListBox>
        </SelectPopover>
      </Select>
    </div>
  );
}
