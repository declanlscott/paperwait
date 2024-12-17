import { useState } from "react";
import { TextField as AriaTextField } from "react-aria-components";
import { roomStatuses } from "@printworks/core/rooms/shared";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { Delete, HousePlus, Lock, LockOpen, Pencil, Save } from "lucide-react";

import { DeleteRoomDialog } from "~/app/components/ui/delete-room-dialog";
import { EnforceRbac } from "~/app/components/ui/enforce-rbac";
import { Markdown } from "~/app/components/ui/markdown";
import { Button } from "~/app/components/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/app/components/ui/primitives/card";
import { DialogTrigger } from "~/app/components/ui/primitives/dialog";
import { Label } from "~/app/components/ui/primitives/field";
import {
  Select,
  SelectItem,
  SelectListBox,
  SelectPopover,
} from "~/app/components/ui/primitives/select";
import { Input, TextArea } from "~/app/components/ui/primitives/text-field";
import { Toggle } from "~/app/components/ui/primitives/toggle";
import { queryFactory, useMutator, useQuery } from "~/app/lib/hooks/data";
import { collectionItem, onSelectionChange } from "~/app/lib/ui";
import { labelStyles } from "~/styles/components/primitives/field";

import type { RoomStatus } from "@printworks/core/rooms/shared";

const routeId = "/_authenticated/settings/rooms/$roomId/";

export const Route = createFileRoute(routeId)({
  beforeLoad: ({ context }) =>
    context.replicache.query((tx) =>
      context.auth.authorizeRoute(tx, context.userId, routeId),
    ),
  loader: async ({ context, params }) => {
    const initialRoom = await context.replicache.query(
      queryFactory.room(params.roomId),
    );
    if (!initialRoom) throw notFound();

    return { initialRoom };
  },
  component: Component,
});

function Component() {
  return (
    <div className="grid gap-6">
      <RoomCard />

      <EnforceRbac roles={["administrator"]}>
        <DangerZoneCard />
      </EnforceRbac>
    </div>
  );
}

function RoomCard() {
  const { roomId } = Route.useParams();
  const { initialRoom } = Route.useLoaderData();

  const room = useQuery(queryFactory.room(roomId), {
    defaultData: initialRoom,
  });

  const [isLocked, setIsLocked] = useState(() => true);
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
        <CardTitle>Room</CardTitle>

        {room?.deletedAt ? null : (
          <Toggle onPress={() => setIsLocked((isLocked) => !isLocked)}>
            {({ isHovered }) =>
              isLocked ? (
                isHovered ? (
                  <LockOpen className="size-5" />
                ) : (
                  <Lock className="size-5" />
                )
              ) : isHovered ? (
                <Lock className="size-5" />
              ) : (
                <LockOpen className="size-5" />
              )
            }
          </Toggle>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <AriaTextField>
          <Label>Name</Label>

          <Input
            disabled={isLocked}
            value={name ?? ""}
            onChange={(e) => setName(e.target.value)}
            onBlur={mutateName}
          />
        </AriaTextField>

        <RoomStatusSelect />

        <RoomDetails isLocked={isLocked} />
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

        <CardDescription>{`The room status is currently "${room?.status ?? ""}".`}</CardDescription>
      </div>

      <Select
        aria-label="status"
        selectedKey={room?.status}
        onSelectionChange={onSelectionChange(roomStatuses, mutate)}
        isDisabled={!!room?.deletedAt}
      >
        <Button>
          <Pencil className="mr-2 size-5" />
          Change Status
        </Button>

        <SelectPopover>
          <SelectListBox items={roomStatuses.map(collectionItem)}>
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

type RoomDetailsProps = {
  isLocked: boolean;
};
function RoomDetails(props: RoomDetailsProps) {
  const { roomId } = Route.useParams();
  const { initialRoom } = Route.useLoaderData();

  const room = useQuery(queryFactory.room(roomId), {
    defaultData: initialRoom,
  });

  const [details, setDetails] = useState(() => room?.details);
  const [isEditing, setIsEditing] = useState(() => false);

  const markdown = props.isLocked ? room?.details : details;

  const { updateRoom } = useMutator();

  const saveDetails = async () => {
    if (room && details !== room.details)
      await updateRoom({
        id: room.id,
        details,
        updatedAt: new Date().toISOString(),
      });
  };

  return (
    <>
      <div className="flex justify-between gap-4">
        <div>
          <span className={labelStyles()}>Details</span>

          <CardDescription>
            Write any additional details about this room, for example, contact
            information or room rules. Markdown is supported.
          </CardDescription>
        </div>

        <div className="flex gap-2">
          <Toggle onPress={() => setIsEditing((toggle) => !toggle)}>
            <Pencil className="size-5" />
          </Toggle>

          <Button
            isDisabled={
              props.isLocked || room?.details === details || !!room?.deletedAt
            }
            onPress={saveDetails}
          >
            <Save className="mr-2 size-5" />
            Save
          </Button>
        </div>
      </div>

      {isEditing ? (
        <TextArea
          disabled={props.isLocked}
          value={details ?? ""}
          onChange={(e) => setDetails(e.target.value)}
        />
      ) : (
        <Card className="bg-muted/20 p-4">
          {markdown ? (
            <Markdown>{markdown}</Markdown>
          ) : (
            <CardDescription>
              There are no details for this room.
            </CardDescription>
          )}
        </Card>
      )}
    </>
  );
}

function DangerZoneCard() {
  const { roomId } = Route.useParams();
  const { initialRoom } = Route.useLoaderData();

  const room = useQuery(queryFactory.room(roomId), {
    defaultData: initialRoom,
  });

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle>Danger Zone</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-6">
        {room?.deletedAt ? <RestoreRoom /> : <DeleteRoom />}
      </CardContent>
    </Card>
  );
}

function DeleteRoom() {
  const { roomId } = Route.useParams();

  return (
    <div className="flex justify-between gap-4">
      <div>
        <span className={labelStyles()}>Delete Room</span>

        <CardDescription>Delete this room.</CardDescription>
      </div>

      <DialogTrigger>
        <Button variant="destructive">
          <Delete className="mr-2 size-5" />
          Delete Room
        </Button>

        <DeleteRoomDialog roomId={roomId} />
      </DialogTrigger>
    </div>
  );
}

function RestoreRoom() {
  const { roomId } = Route.useParams();

  const { restoreRoom } = useMutator();

  return (
    <div className="flex justify-between gap-4">
      <div>
        <span className={labelStyles()}>Restore Room</span>

        <CardDescription>
          This room has been deleted. You can restore it here.
        </CardDescription>
      </div>

      <Button variant="secondary" onPress={() => restoreRoom({ id: roomId })}>
        <HousePlus className="mr-2 size-5" />
        Restore Room
      </Button>
    </div>
  );
}
