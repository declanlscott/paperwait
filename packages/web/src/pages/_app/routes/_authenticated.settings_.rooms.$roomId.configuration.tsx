import { useMemo, useState } from "react";
import Editor from "@monaco-editor/react";
import {
  DeliveryOptionsConfiguration,
  RoomConfiguration,
  WorkflowConfiguration,
} from "@paperwait/core/schemas";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { Save } from "lucide-react";
import * as R from "remeda";
import { toast } from "sonner";
import * as v from "valibot";

import { Button } from "~/app/components/ui/primitives/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/app/components/ui/primitives/card";
import { queryFactory, useMutator, useQuery } from "~/app/lib/hooks/data";

export const Route = createFileRoute(
  "/_authenticated/settings/rooms/$roomId/configuration",
)({
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
});

function Component() {
  return (
    <div className="grid gap-6">
      <WorkflowCard />

      <DeliveryOptionsCard />
    </div>
  );
}

function WorkflowCard() {
  const { roomId } = Route.useParams();
  const { initialRoom } = Route.useLoaderData();

  const room = useQuery(queryFactory.room(roomId), {
    defaultData: initialRoom,
  });

  const [editorText, setEditorText] = useState(() =>
    JSON.stringify(room?.config?.workflow, undefined, 4),
  );

  const isSaveable = useMemo(() => {
    try {
      return !R.isDeepEqual(JSON.parse(editorText), room?.config?.workflow);
    } catch (e) {
      console.error(e);

      return false;
    }
  }, [editorText, room?.config?.workflow]);

  const { updateRoom } = useMutator();

  async function saveConfig() {
    if (room) {
      const result = v.safeParse(WorkflowConfiguration, JSON.parse(editorText));
      if (!result.success) return toast.error("Invalid workflow configuration");

      await updateRoom({
        id: roomId,
        config: v.parse(RoomConfiguration, {
          ...room.config,
          workflow: result.output,
        }),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Workflow</CardTitle>
        </div>

        <Button isDisabled={!isSaveable} onPress={saveConfig}>
          <Save className="mr-2 size-5" />
          Save
        </Button>
      </CardHeader>

      <CardContent>
        <Editor
          className="h-96"
          language="json"
          value={editorText}
          onChange={(value) => setEditorText(() => value ?? "")}
        />
      </CardContent>
    </Card>
  );
}

function DeliveryOptionsCard() {
  const { roomId } = Route.useParams();
  const { initialRoom } = Route.useLoaderData();

  const room = useQuery(queryFactory.room(roomId), {
    defaultData: initialRoom,
  });

  const [editorText, setEditorText] = useState(() =>
    JSON.stringify(room?.config?.deliveryOptions, undefined, 4),
  );

  const isSaveable = useMemo(() => {
    try {
      return !R.isDeepEqual(
        JSON.parse(editorText),
        room?.config?.deliveryOptions,
      );
    } catch (e) {
      console.error(e);

      return false;
    }
  }, [editorText, room?.config?.deliveryOptions]);

  const { updateRoom } = useMutator();

  async function saveConfig() {
    if (room) {
      const result = v.safeParse(
        DeliveryOptionsConfiguration,
        JSON.parse(editorText),
      );
      if (!result.success)
        return toast.error("Invalid delivery options configuration");

      await updateRoom({
        id: roomId,
        config: v.parse(RoomConfiguration, {
          ...room.config,
          deliveryOptions: result.output,
        }),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Delivery Options</CardTitle>
        </div>

        <Button isDisabled={!isSaveable} onPress={saveConfig}>
          <Save className="mr-2 size-5" />
          Save
        </Button>
      </CardHeader>

      <CardContent>
        <Editor
          className="h-96"
          language="json"
          value={editorText}
          onChange={(value) => setEditorText(() => value ?? "")}
        />
      </CardContent>
    </Card>
  );
}
