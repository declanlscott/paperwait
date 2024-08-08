import { TextField as AriaTextField, FileTrigger } from "react-aria-components";
import {
  WorkflowConfiguration,
  workflowStatusTypes,
} from "@paperwait/core/schemas";
import { formatPascalCase } from "@paperwait/core/utils";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { valibotValidator } from "@tanstack/valibot-form-adapter";
import { ChevronDown, ChevronUp, Import, Plus, Save } from "lucide-react";
import * as v from "valibot";

import { Button } from "~/app/components/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/app/components/ui/primitives/card";
import { Checkbox } from "~/app/components/ui/primitives/checkbox";
import {
  ColorArea,
  ColorField,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  ColorSwatchPickerItem,
  ColorThumb,
  SliderTrack,
} from "~/app/components/ui/primitives/color";
import { Dialog, DialogTrigger } from "~/app/components/ui/primitives/dialog";
import { Label } from "~/app/components/ui/primitives/field";
import { Popover } from "~/app/components/ui/primitives/popover";
import {
  Select,
  SelectItem,
  SelectListBox,
  SelectPopover,
  SelectTrigger,
} from "~/app/components/ui/primitives/select";
import { Input } from "~/app/components/ui/primitives/text-field";
import {
  Tooltip,
  TooltipTrigger,
} from "~/app/components/ui/primitives/tooltip";
import { XButton } from "~/app/components/ui/primitives/x-button";
import { queryFactory, useMutator, useQuery } from "~/app/lib/hooks/data";
import { collectionItem, onSelectionChange } from "~/app/lib/ui";
import { cardStyles } from "~/styles/components/primitives/card";

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

  const { updateRoom } = useMutator();

  const form = useForm({
    defaultValues: {
      config: v.parse(WorkflowConfiguration, room?.config.workflow),
    },
    validatorAdapter: valibotValidator(),
    onSubmit: ({ value }) => {
      console.log({ value });
    },
  });

  return (
    <form
      className={cardStyles().base({ className: "min-w-0" })}
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();

        await form.handleSubmit();
      }}
    >
      <CardHeader>
        <div className="flex justify-between gap-4 space-y-0">
          <CardTitle>Workflow</CardTitle>

          <form.Subscribe selector={({ canSubmit }) => canSubmit}>
            {(canSubmit) => (
              <Button type="submit" isDisabled={!canSubmit}>
                <Save className="mr-2 size-5" />
                Save
              </Button>
            )}
          </form.Subscribe>
        </div>

        <CardDescription>
          Paperwait allows you to define your own order workflow. The workflow
          determines the stages (or status) through which orders will progress.
          The workflow is displayed in the dashboard interface for operators.
        </CardDescription>
      </CardHeader>

      <form.Field name="config" mode="array">
        {(field) => (
          <>
            <CardContent>
              <ol className="space-y-4">
                {field.state.value.map((_, i) => (
                  <li
                    key={i}
                    className={cardStyles().base({
                      className:
                        "bg-muted/20 relative grid grid-cols-6 gap-2 p-4",
                    })}
                  >
                    <XButton
                      onPress={() => field.removeValue(i)}
                      className="absolute right-3 top-3"
                    />

                    <form.Field name={`config[${i}].name`}>
                      {(subField) => (
                        <AriaTextField className="col-span-3">
                          <Label htmlFor={`config[${i}].name`}>Name</Label>

                          <Input
                            id={`config[${i}].name`}
                            value={subField.state.value}
                            onChange={(e) =>
                              subField.handleChange(e.target.value)
                            }
                          />
                        </AriaTextField>
                      )}
                    </form.Field>

                    <form.Field name={`config[${i}].type`}>
                      {(subField) => (
                        <AriaTextField className="col-span-3">
                          <Label htmlFor={`config[${i}].type`}>Type</Label>

                          <Select
                            id={`config[${i}].type`}
                            selectedKey={subField.state.value}
                            onSelectionChange={onSelectionChange(
                              workflowStatusTypes,
                              subField.handleChange,
                            )}
                            aria-label="type"
                          >
                            <SelectTrigger>
                              {formatPascalCase(subField.state.value ?? "")}
                            </SelectTrigger>

                            <SelectPopover>
                              <SelectListBox
                                items={workflowStatusTypes.map(collectionItem)}
                              >
                                {(item) => (
                                  <SelectItem
                                    id={item.name}
                                    textValue={formatPascalCase(item.name)}
                                  >
                                    {formatPascalCase(item.name)}
                                  </SelectItem>
                                )}
                              </SelectListBox>
                            </SelectPopover>
                          </Select>
                        </AriaTextField>
                      )}
                    </form.Field>

                    <form.Field name={`config[${i}].charging`}>
                      {(subField) => (
                        <Checkbox
                          isSelected={subField.state.value}
                          onChange={subField.handleChange}
                          className="col-span-2"
                        >
                          <span className="text-muted-foreground text-sm">
                            Charging
                          </span>
                        </Checkbox>
                      )}
                    </form.Field>

                    <div className="col-span-2 flex justify-center gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        isDisabled={i === 0}
                        onPress={() => field.moveValue(i, i - 1)}
                      >
                        <ChevronUp className="size-5" />
                      </Button>

                      <Button
                        variant="secondary"
                        size="icon"
                        isDisabled={i === field.state.value.length - 1}
                        onPress={() => field.moveValue(i, i + 1)}
                      >
                        <ChevronDown className="size-5" />
                      </Button>
                    </div>

                    <form.Field name={`config[${i}].color`}>
                      {(subField) => (
                        <div className="col-span-2 flex items-center justify-end">
                          <ColorPicker
                            value={subField.state.value ?? "#000"}
                            onChange={(color) =>
                              subField.handleChange(color.toString("hex"))
                            }
                          >
                            <TooltipTrigger>
                              <DialogTrigger>
                                <Button
                                  variant="ghost"
                                  className="flex h-fit items-center gap-2 p-1"
                                >
                                  <ColorSwatch className="size-8 rounded-md border-2" />
                                </Button>

                                <Popover
                                  placement="bottom start"
                                  className="w-fit"
                                >
                                  <Dialog className="flex flex-col gap-4 p-3 outline-none">
                                    <div>
                                      <ColorArea
                                        colorSpace="hsb"
                                        xChannel="saturation"
                                        yChannel="brightness"
                                        className="h-[164px] rounded-b-none border-b-0"
                                      >
                                        <ColorThumb className="z-50" />
                                      </ColorArea>

                                      <ColorSlider
                                        colorSpace="hsb"
                                        channel="hue"
                                      >
                                        <SliderTrack className="rounded-t-none border-t-0">
                                          <ColorThumb className="top-1/2" />
                                        </SliderTrack>
                                      </ColorSlider>
                                    </div>

                                    <ColorField
                                      colorSpace="hsb"
                                      className="w-[192px]"
                                    >
                                      <Label>Hex</Label>

                                      <Input className="" />
                                    </ColorField>

                                    <ColorSwatchPicker className="w-[192px]">
                                      <ColorSwatchPickerItem color="#F00">
                                        <ColorSwatch />
                                      </ColorSwatchPickerItem>

                                      <ColorSwatchPickerItem color="#f90">
                                        <ColorSwatch />
                                      </ColorSwatchPickerItem>

                                      <ColorSwatchPickerItem color="#0F0">
                                        <ColorSwatch />
                                      </ColorSwatchPickerItem>

                                      <ColorSwatchPickerItem color="#08f">
                                        <ColorSwatch />
                                      </ColorSwatchPickerItem>

                                      <ColorSwatchPickerItem color="#00f">
                                        <ColorSwatch />
                                      </ColorSwatchPickerItem>
                                    </ColorSwatchPicker>
                                  </Dialog>
                                </Popover>
                              </DialogTrigger>

                              <Tooltip placement="left">
                                <p>Hex Color</p>
                              </Tooltip>
                            </TooltipTrigger>
                          </ColorPicker>
                        </div>
                      )}
                    </form.Field>
                  </li>
                ))}
              </ol>
            </CardContent>

            <CardFooter className="justify-between">
              <FileTrigger>
                <Button variant="outline">
                  <Import className="mr-2 size-5" />
                  Import
                </Button>
              </FileTrigger>

              <Button
                variant="secondary"
                onPress={() =>
                  field.pushValue({
                    name: "",
                    type: "New",
                    charging: false,
                  })
                }
              >
                <Plus className="mr-2 size-5" />
                Add
              </Button>
            </CardFooter>
          </>
        )}
      </form.Field>
    </form>
  );
}

function DeliveryOptionsCard() {
  const { roomId } = Route.useParams();
  const { initialRoom } = Route.useLoaderData();

  const room = useQuery(queryFactory.room(roomId), {
    defaultData: initialRoom,
  });

  // const [editorText, setEditorText] = useState(() =>
  //   JSON.stringify(room?.config?.deliveryOptions, undefined, 4),
  // );

  // const isSaveable = useMemo(() => {
  //   try {
  //     return !R.isDeepEqual(
  //       JSON.parse(editorText),
  //       room?.config?.deliveryOptions,
  //     );
  //   } catch (e) {
  //     console.error(e);

  //     return false;
  //   }
  // }, [editorText, room?.config?.deliveryOptions]);

  // const { updateRoom } = useMutator();

  // async function saveConfig() {
  //   if (room) {
  //     const result = v.safeParse(
  //       DeliveryOptionsConfiguration,
  //       JSON.parse(editorText),
  //     );
  //     if (!result.success)
  //       return toast.error("Invalid delivery options configuration");

  //     await updateRoom({
  //       id: roomId,
  //       config: v.parse(RoomConfiguration, {
  //         ...room.config,
  //         deliveryOptions: result.output,
  //       }),
  //       updatedAt: new Date().toISOString(),
  //     });
  //   }
  // }

  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Delivery Options</CardTitle>
        </div>

        {/* <Button isDisabled={!isSaveable} onPress={saveConfig}>
          <Save className="mr-2 size-5" />
          Save
        </Button> */}
      </CardHeader>

      <CardContent></CardContent>
    </Card>
  );
}
