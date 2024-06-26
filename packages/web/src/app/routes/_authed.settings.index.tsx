import { useState } from "react";
import { TextField as AriaTextField } from "react-aria-components";
import { OrgStatus } from "@paperwait/core/organization";
import { fn } from "@paperwait/core/valibot";
import { createFileRoute } from "@tanstack/react-router";
import { Lock, LockOpen, Pencil } from "lucide-react";
import { useSubscribe } from "replicache-react";
import * as v from "valibot";

import { Button } from "~/app/components/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/app/components/ui/primitives/card";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
} from "~/app/components/ui/primitives/dialog";
import { Label } from "~/app/components/ui/primitives/field";
import { Input } from "~/app/components/ui/primitives/input";
import {
  Select,
  SelectCollection,
  SelectContent,
  SelectItem,
  SelectPopover,
  SelectTrigger,
  SelectValue,
} from "~/app/components/ui/primitives/select";
import { useReplicache } from "~/app/lib/hooks/replicache";
import { labelStyles } from "~/shared/styles/components/primitives/field";

import type { Organization } from "@paperwait/core/organization";

export const Route = createFileRoute("/_authed/settings/")({
  component: Component,
});

function Component() {
  const replicache = useReplicache();

  const org = useSubscribe(replicache, (tx) =>
    tx
      .scan<Organization>({ prefix: "organization/" })
      .toArray()
      .then((values) => values.at(0)),
  );

  return (
    <div className="grid gap-6">
      {org && (
        <>
          <OrganizationCard {...org} />

          <DangerZoneCard {...org} />
        </>
      )}
    </div>
  );
}

function OrganizationCard(org: Organization) {
  const [isLocked, setIsLocked] = useState(true);

  const [names, setNames] = useState(() => ({
    full: org.name,
    short: org.slug,
  }));

  const { mutate } = useReplicache();

  async function mutateName() {
    const name = names.full.trim();
    if (name === org.name) return;

    await mutate.updateOrganization({
      id: org.id,
      name,
      updatedAt: new Date().toISOString(),
    });
  }

  async function mutateSlug() {
    const slug = names.short.trim();
    if (slug === org.slug) return;

    await mutate.updateOrganization({
      id: org.id,
      slug,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row justify-between gap-4 space-y-0">
        <div className="flex flex-col space-y-1.5">
          <CardTitle>Organization</CardTitle>

          <CardDescription>
            Edit your organization's full and short names. The short name must
            be globally unique.
          </CardDescription>
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

      <CardContent className="space-y-4">
        <AriaTextField>
          <Label>Full Name</Label>

          <Input
            disabled={isLocked}
            value={names.full}
            onChange={(e) =>
              setNames((names) => ({ ...names, full: e.target.value }))
            }
            onBlur={mutateName}
          />
        </AriaTextField>

        <AriaTextField>
          <Label>Short Name</Label>

          <Input
            disabled={isLocked}
            value={names.short}
            onChange={(e) =>
              setNames((names) => ({ ...names, short: e.target.value }))
            }
            onBlur={mutateSlug}
          />
        </AriaTextField>
      </CardContent>
    </Card>
  );
}

function DangerZoneCard(org: Organization) {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle>Danger Zone</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex justify-between gap-4">
          <div>
            <span className={labelStyles()}>Status</span>

            <CardDescription>{`This organization is currently "${org.status}".`}</CardDescription>
          </div>

          <DialogTrigger>
            <Button variant="destructive">
              <Pencil className="mr-2 size-5" />
              Change status
            </Button>

            <DialogOverlay>
              <ChangeStatus {...org} />
            </DialogOverlay>
          </DialogTrigger>
        </div>
      </CardContent>
    </Card>
  );
}

function ChangeStatus(org: Organization) {
  const { mutate } = useReplicache();

  const [status, setStatus] = useState(() => org.status);

  const [confirmationText, setConfirmationText] = useState("");

  const isConfirmed = confirmationText === org.name;

  async function mutateStatus() {
    if (status === "initializing") return;
    if (status === org.status) return;

    await mutate.updateOrganization({
      id: org.id,
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  return (
    <DialogContent>
      {({ close: closeStatusDialog }) => (
        <>
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>

            <p className="text-muted-foreground text-sm">
              Change the status of this organization.
            </p>

            <p className="text-muted-foreground text-sm">
              Changing the status to "Suspended" will log out all
              non-administrator users and prevent them from logging in.
            </p>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="status">Status</Label>

              <Select
                aria-label="status"
                selectedKey={status}
                onSelectionChange={fn(
                  v.picklist(OrgStatus.enumValues),
                  setStatus,
                )}
                className="w-36"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>

                <SelectPopover>
                  <SelectContent aria-label="status">
                    <SelectCollection
                      items={OrgStatus.enumValues
                        .filter((status) => status !== "initializing")
                        .map((status) => ({
                          name: status,
                        }))}
                    >
                      {(item) => (
                        <SelectItem id={item.name} textValue={item.name}>
                          {item.name.charAt(0).toUpperCase() +
                            item.name.slice(1)}
                        </SelectItem>
                      )}
                    </SelectCollection>
                  </SelectContent>
                </SelectPopover>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onPress={() => closeStatusDialog()}>
              Cancel
            </Button>

            {status === "active" ? (
              <Button
                onPress={() => mutateStatus().then(closeStatusDialog)}
                isDisabled={status === org.status}
              >
                Save
              </Button>
            ) : (
              <DialogTrigger>
                <Button isDisabled={status === org.status}>Save</Button>

                <DialogOverlay isDismissable={false}>
                  <DialogContent role="alertdialog">
                    {({ close: closeConfirmationDialog }) => (
                      <>
                        <DialogHeader>
                          <DialogTitle>Suspend "{org.name}"?</DialogTitle>

                          <p className="text-muted-foreground text-sm">
                            Are you sure you want to continue? This action may
                            be disruptive for your users.
                          </p>

                          <p className="text-muted-foreground text-sm">
                            To confirm suspending, enter the full name of your
                            organization in the text field below.
                          </p>
                        </DialogHeader>

                        <div className="grid gap-4 py-4">
                          <AriaTextField>
                            <Label>Full Name</Label>

                            <Input
                              placeholder={org.name}
                              value={confirmationText}
                              onChange={(e) =>
                                setConfirmationText(e.target.value)
                              }
                            />
                          </AriaTextField>
                        </div>

                        <DialogFooter>
                          <Button
                            variant="ghost"
                            autoFocus
                            onPress={() => {
                              closeConfirmationDialog();
                              setConfirmationText("");
                            }}
                          >
                            Cancel
                          </Button>

                          <Button
                            onPress={() =>
                              mutateStatus().then(() => {
                                closeConfirmationDialog();
                                closeStatusDialog();
                              })
                            }
                            isDisabled={!isConfirmed}
                          >
                            Suspend
                          </Button>
                        </DialogFooter>
                      </>
                    )}
                  </DialogContent>
                </DialogOverlay>
              </DialogTrigger>
            )}
          </DialogFooter>
        </>
      )}
    </DialogContent>
  );
}
