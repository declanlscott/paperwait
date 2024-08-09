import { FileTrigger } from "react-aria-components";
import {
  DeliveryOptionsConfiguration,
  WorkflowConfiguration,
  workflowStatusTypes,
} from "@paperwait/core/schemas";
import { formatPascalCase } from "@paperwait/core/utils";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, notFound } from "@tanstack/react-router";
import { valibotValidator } from "@tanstack/valibot-form-adapter";
import { ChevronDown, ChevronUp, Import, Plus, Save, X } from "lucide-react";
import * as R from "remeda";
import * as v from "valibot";

import { Button } from "~/app/components/ui/primitives/button";
import {
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
import { FieldGroup, Label } from "~/app/components/ui/primitives/field";
import { IconButton } from "~/app/components/ui/primitives/icon-button";
import {
  NumberField,
  NumberFieldInput,
  NumberFieldSteppers,
} from "~/app/components/ui/primitives/number-field";
import { Popover } from "~/app/components/ui/primitives/popover";
import {
  Select,
  SelectItem,
  SelectListBox,
  SelectPopover,
  SelectTrigger,
} from "~/app/components/ui/primitives/select";
import { Input } from "~/app/components/ui/primitives/text-field";
import { queryFactory, useMutator, useQuery } from "~/app/lib/hooks/data";
import { collectionItem } from "~/app/lib/ui";
import { cardStyles } from "~/styles/components/primitives/card";

import type {
  RoomConfiguration,
  WorkflowStatusType,
} from "@paperwait/core/schemas";

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
      workflow: v.parse(WorkflowConfiguration, room?.config.workflow),
    },
    validatorAdapter: valibotValidator(),
    validators: {
      onBlur: v.object({ workflow: WorkflowConfiguration }),
    },
    onSubmit: async ({ value: { workflow } }) => {
      if (room) {
        const config = room.config as RoomConfiguration;

        if (!R.isDeepEqual(workflow, config.workflow))
          await updateRoom({
            id: room.id,
            config: {
              ...config,
              workflow,
            },
            updatedAt: new Date().toISOString(),
          });
      }
    },
  });

  return (
    <form
      className={cardStyles().base()}
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();

        await form.handleSubmit();
      }}
    >
      <CardHeader>
        <div className="flex justify-between gap-4">
          <CardTitle>Workflow</CardTitle>

          <form.Subscribe
            selector={(state) => [state.canSubmit, state.values.workflow]}
          >
            {([canSubmit, workflow]) => (
              <Button
                type="submit"
                isDisabled={
                  !canSubmit ||
                  R.isDeepEqual(
                    workflow,
                    room?.config.workflow as WorkflowConfiguration,
                  )
                }
              >
                <Save className="mr-2 size-5" />
                Save
              </Button>
            )}
          </form.Subscribe>
        </div>

        <CardDescription>
          The workflow determines the stages (or status) through which orders
          will progress. The workflow is displayed in the dashboard interface
          for operators.
        </CardDescription>

        <form.Subscribe selector={(state) => state.errors}>
          {(errors) => (
            <ul className="list-disc pl-6 pt-2">
              {errors.map((e, i) => (
                <li key={i} className="text-destructive">
                  {e}
                </li>
              ))}
            </ul>
          )}
        </form.Subscribe>
      </CardHeader>

      <form.Field name="workflow" mode="array">
        {({ state, removeValue, moveValue, pushValue, validate }) => (
          <>
            <CardContent>
              <ol className="space-y-4">
                {state.value.map((status, i) => (
                  <li
                    key={i}
                    className={cardStyles().base({
                      className:
                        "bg-muted/20 relative grid grid-cols-2 gap-2 p-4",
                    })}
                  >
                    <div className="absolute right-2.5 top-2.5 flex gap-2">
                      <IconButton
                        onPress={() => moveValue(i, i + 1)}
                        isDisabled={i === state.value.length - 1}
                        aria-label={`Move ${status.name} down`}
                      >
                        <ChevronDown />
                      </IconButton>

                      <IconButton
                        onPress={() => moveValue(i, i - 1)}
                        isDisabled={i === 0}
                        aria-label={`Move ${status.name} up`}
                      >
                        <ChevronUp />
                      </IconButton>

                      <IconButton
                        onPress={() =>
                          removeValue(i).then(() => validate("blur"))
                        }
                        aria-label={`Remove ${status.name}`}
                      >
                        <X />
                      </IconButton>
                    </div>

                    <form.Field name={`workflow[${i}].name`}>
                      {({ name, state, handleChange, handleBlur }) => (
                        <div>
                          <Label htmlFor={name}>Name</Label>

                          <Input
                            id={name}
                            value={state.value}
                            onChange={(e) => handleChange(e.target.value)}
                            onBlur={handleBlur}
                          />
                        </div>
                      )}
                    </form.Field>

                    <form.Field name={`workflow[${i}].type`}>
                      {({ name, state, handleChange, handleBlur }) => (
                        <div>
                          <Label htmlFor={name}>Type</Label>

                          <Select
                            id={name}
                            aria-label="type"
                            selectedKey={state.value}
                            onSelectionChange={(value) =>
                              handleChange(value as WorkflowStatusType)
                            }
                            onBlur={handleBlur}
                          >
                            <SelectTrigger>
                              {formatPascalCase(state.value ?? "")}
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
                        </div>
                      )}
                    </form.Field>

                    <form.Field name={`workflow[${i}].charging`}>
                      {({ state, handleChange, handleBlur }) => (
                        <Checkbox
                          isSelected={state.value}
                          onChange={handleChange}
                          onBlur={handleBlur}
                        >
                          <span className="text-sm">Charging</span>
                        </Checkbox>
                      )}
                    </form.Field>

                    <form.Field name={`workflow[${i}].color`}>
                      {({ state, handleChange }) => (
                        <div className="flex items-center justify-end">
                          <ColorPicker
                            value={state.value ?? "#000"}
                            onChange={(color) =>
                              handleChange(color.toString("hex"))
                            }
                          >
                            <DialogTrigger>
                              <Button
                                variant="ghost"
                                className="flex h-fit items-center gap-2 p-1"
                              >
                                Hex Color
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

                                    <ColorSlider colorSpace="hsb" channel="hue">
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
                  pushValue({
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

  const { updateRoom } = useMutator();

  const form = useForm({
    defaultValues: {
      deliveryOptions: v.parse(
        DeliveryOptionsConfiguration,
        room?.config.deliveryOptions,
      ),
    },
    validatorAdapter: valibotValidator(),
    validators: {
      onBlur: v.object({ deliveryOptions: DeliveryOptionsConfiguration }),
    },
    onSubmit: async ({ value: { deliveryOptions } }) => {
      if (room) {
        const config = room.config as RoomConfiguration;

        if (!R.isDeepEqual(deliveryOptions, config.deliveryOptions))
          await updateRoom({
            id: room.id,
            config: {
              ...config,
              deliveryOptions,
            },
            updatedAt: new Date().toISOString(),
          });
      }
    },
  });

  return (
    <form
      className={cardStyles().base()}
      onSubmit={async (e) => {
        e.preventDefault();
        e.stopPropagation();

        await form.handleSubmit();
      }}
    >
      <CardHeader>
        <div className="flex justify-between gap-4">
          <CardTitle>Delivery Options</CardTitle>

          <form.Subscribe
            selector={(state) => [
              state.canSubmit,
              state.values.deliveryOptions,
            ]}
          >
            {([canSubmit, deliveryOptions]) => (
              <Button
                type="submit"
                isDisabled={
                  !canSubmit ||
                  R.isDeepEqual(
                    deliveryOptions,
                    room?.config
                      .deliveryOptions as DeliveryOptionsConfiguration,
                  )
                }
              >
                <Save className="mr-2 size-5" />
                Save
              </Button>
            )}
          </form.Subscribe>
        </div>

        <CardDescription>
          Delivery options are the methods by which orders can be delivered to
          customers. Delivery options are displayed in the New Order form for
          customers.
        </CardDescription>

        <form.Subscribe selector={(state) => state.errors}>
          {(errors) => (
            <ul className="list-disc pl-6 pt-2">
              {errors.map((e, i) => (
                <li key={i} className="text-destructive">
                  {e}
                </li>
              ))}
            </ul>
          )}
        </form.Subscribe>
      </CardHeader>

      <form.Field name="deliveryOptions" mode="array">
        {({ state, removeValue, moveValue, pushValue, validate }) => (
          <>
            <CardContent>
              <ol className="space-y-4">
                {state.value.map((option, i) => (
                  <li
                    key={i}
                    className={cardStyles().base({
                      className:
                        "bg-muted/20 relative grid grid-cols-2 gap-2 p-4",
                    })}
                  >
                    <div className="absolute right-2.5 top-2.5 flex gap-2">
                      <IconButton
                        onPress={() => moveValue(i, i + 1)}
                        isDisabled={i === state.value.length - 1}
                        aria-label={`Move ${option.name} down`}
                      >
                        <ChevronDown />
                      </IconButton>

                      <IconButton
                        onPress={() => moveValue(i, i - 1)}
                        isDisabled={i === 0}
                        aria-label={`Move ${option.name} up`}
                      >
                        <ChevronUp />
                      </IconButton>

                      <IconButton
                        onPress={() =>
                          removeValue(i).then(() => validate("blur"))
                        }
                        aria-label={`Remove ${option.name}`}
                      >
                        <X />
                      </IconButton>
                    </div>

                    <form.Field name={`deliveryOptions[${i}].name`}>
                      {({ name, state, handleChange, handleBlur }) => (
                        <div>
                          <Label htmlFor={name}>Name</Label>

                          <Input
                            id={name}
                            value={state.value}
                            onChange={(e) => handleChange(e.target.value)}
                            onBlur={handleBlur}
                          />
                        </div>
                      )}
                    </form.Field>

                    <form.Field name={`deliveryOptions[${i}].description`}>
                      {({ name, state, handleChange, handleBlur }) => (
                        <div>
                          <Label htmlFor={name}>Description</Label>

                          <Input
                            id={name}
                            value={state.value}
                            onChange={(e) => handleChange(e.target.value)}
                            onBlur={handleBlur}
                          />
                        </div>
                      )}
                    </form.Field>

                    <form.Field name={`deliveryOptions[${i}].detailsLabel`}>
                      {({ name, state, handleChange, handleBlur }) => (
                        <div>
                          <Label htmlFor={name}>Details Label</Label>

                          <Input
                            id={name}
                            value={state.value ?? ""}
                            onChange={(e) => handleChange(e.target.value)}
                            onBlur={handleBlur}
                          />
                        </div>
                      )}
                    </form.Field>

                    <form.Field name={`deliveryOptions[${i}].cost`}>
                      {({ name, state, handleChange, handleBlur }) => (
                        <NumberField
                          value={state.value ?? 0}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          formatOptions={{
                            style: "currency",
                            currency: "USD",
                            currencyDisplay: "symbol",
                            currencySign: "standard",
                          }}
                          step={0.01}
                          minValue={0}
                        >
                          <Label htmlFor={name}>Cost</Label>

                          <FieldGroup>
                            <NumberFieldInput />

                            <NumberFieldSteppers />
                          </FieldGroup>
                        </NumberField>
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
                  pushValue({
                    name: "",
                    description: "",
                    detailsLabel: "",
                    cost: 0,
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
