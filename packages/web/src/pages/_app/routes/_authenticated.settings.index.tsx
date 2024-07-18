import { useState } from "react";
import { TextField as AriaTextField } from "react-aria-components";
import { OrgStatus } from "@paperwait/core/organization";
import { fn } from "@paperwait/core/valibot";
import { createFileRoute } from "@tanstack/react-router";
import { Lock, LockOpen, Pencil, UserRoundX } from "lucide-react";
import * as v from "valibot";

import { DeleteUserDialog } from "~/app/components/ui/delete-user-dialog";
import { EnforceRbac } from "~/app/components/ui/enforce-rbac";
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
} from "~/app/components/ui/primitives/select";
import { useAuthenticated } from "~/app/lib/hooks/auth";
import { queryFactory, useMutator, useQuery } from "~/app/lib/hooks/data";
import { labelStyles } from "~/styles/components/primitives/field";

import type { Organization } from "@paperwait/core/organization";

export const Route = createFileRoute("/_authenticated/settings/")({
  loader: async ({ context }) => {
    const initialOrg = await context.replicache.query(
      queryFactory.organization,
    );

    return { initialOrg };
  },
  component: Component,
});

function Component() {
  return (
    <div className="grid gap-6">
      <EnforceRbac roles={["administrator"]}>
        <OrganizationCard />
      </EnforceRbac>

      <DangerZoneCard />
    </div>
  );
}

function OrganizationCard() {
  const { initialOrg } = Route.useLoaderData();

  const org = useQuery(queryFactory.organization, { defaultData: initialOrg });

  const [isLocked, setIsLocked] = useState(true);

  const [fullName, setFullName] = useState<Organization["name"]>();
  const [shortName, setShortName] = useState<Organization["slug"]>();

  const { updateOrganization } = useMutator();

  async function mutateName() {
    if (org && fullName) {
      const name = fullName.trim();
      if (name === org.name) return;

      await updateOrganization({
        id: org.id,
        name: fullName,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async function mutateSlug() {
    if (org && shortName) {
      const slug = shortName.trim();
      if (slug === org.slug) return;

      await updateOrganization({
        id: org.id,
        slug,
        updatedAt: new Date().toISOString(),
      });
    }
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
            value={fullName ?? org?.name ?? ""}
            onChange={(e) => setFullName(e.target.value)}
            onBlur={mutateName}
          />
        </AriaTextField>

        <AriaTextField>
          <Label>Short Name</Label>

          <Input
            disabled={isLocked}
            value={shortName ?? org?.slug ?? ""}
            onChange={(e) => setShortName(e.target.value)}
            onBlur={mutateSlug}
          />
        </AriaTextField>
      </CardContent>
    </Card>
  );
}

function DangerZoneCard() {
  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle>Danger Zone</CardTitle>
      </CardHeader>

      <CardContent className="grid gap-6">
        <DeleteAccount />

        <EnforceRbac roles={["administrator"]}>
          <OrganizationStatus />
        </EnforceRbac>
      </CardContent>
    </Card>
  );
}

function DeleteAccount() {
  const { user } = useAuthenticated();

  return (
    <div className="flex justify-between gap-4">
      <div>
        <span className={labelStyles()}>Delete User Account</span>

        <CardDescription>Delete your user account.</CardDescription>
      </div>

      <DialogTrigger>
        <Button variant="destructive">
          <UserRoundX className="mr-2 size-5" />
          Delete Account
        </Button>

        <DeleteUserDialog userId={user.id} />
      </DialogTrigger>
    </div>
  );
}

function OrganizationStatus() {
  const { initialOrg } = Route.useLoaderData();

  const org = useQuery(queryFactory.organization, { defaultData: initialOrg });

  const { updateOrganization } = useMutator();

  const [isConfirmationDialogOpen, setIsConfirmationDialogOpen] =
    useState(false);

  const [confirmationText, setConfirmationText] = useState("");

  const isConfirmed = confirmationText === org?.name;

  async function mutate(status: Organization["status"]) {
    if (org) {
      if (status === "initializing") return;
      if (status === org.status) return;

      await updateOrganization({
        id: org.id,
        status,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return (
    <div className="flex justify-between gap-4">
      <div>
        <span className={labelStyles()}>Status</span>

        <CardDescription>{`This organization is currently "${org?.status ?? ""}".`}</CardDescription>
      </div>

      <Select
        aria-label="status"
        selectedKey={org?.status}
        onSelectionChange={fn(v.picklist(OrgStatus.enumValues), (status) => {
          switch (status) {
            case "active":
              return mutate("active");
            case "suspended":
              if (org?.status !== "suspended" && status === "suspended")
                setIsConfirmationDialogOpen(true);
          }
        })}
      >
        <Button variant="destructive">
          <Pencil className="mr-2 size-5" />
          Change Status
        </Button>

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
                <SelectItem
                  id={item.name}
                  textValue={item.name}
                  className="capitalize"
                >
                  {item.name}
                </SelectItem>
              )}
            </SelectCollection>
          </SelectContent>
        </SelectPopover>
      </Select>

      <DialogOverlay
        isDismissable={false}
        isOpen={isConfirmationDialogOpen}
        onOpenChange={setIsConfirmationDialogOpen}
      >
        <DialogContent role="alertdialog">
          {({ close }) => (
            <>
              <DialogHeader>
                <DialogTitle>Suspend "{org?.name}"?</DialogTitle>

                <p className="text-muted-foreground text-sm">
                  Are you sure you want to continue? This action may be
                  disruptive for your users.
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
                    placeholder={org?.name}
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                  />
                </AriaTextField>
              </div>

              <DialogFooter>
                <Button
                  variant="ghost"
                  autoFocus
                  onPress={() => {
                    close();
                    setConfirmationText("");
                  }}
                >
                  Cancel
                </Button>

                <Button
                  onPress={() =>
                    mutate("suspended").then(() => {
                      close();
                      setConfirmationText("");
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
    </div>
  );
}
