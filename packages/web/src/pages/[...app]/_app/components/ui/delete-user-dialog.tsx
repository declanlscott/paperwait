import { useState } from "react";
import { TextField as AriaTextField } from "react-aria-components";

import { EnforceRbac } from "~/app/components/ui/enforce-rbac";
import { Button } from "~/app/components/ui/primitives/button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "~/app/components/ui/primitives/dialog";
import { Label } from "~/app/components/ui/primitives/field";
import { Input } from "~/app/components/ui/primitives/text-field";
import { useAuthenticated, useLogout } from "~/app/lib/hooks/auth";
import { queryFactory, useMutator, useQuery } from "~/app/lib/hooks/data";

import type { User } from "@paperwait/core/users/sql";
import type { DialogOverlayProps } from "~/app/components/ui/primitives/dialog";

export interface DeleteUserDialogProps {
  userId: User["id"];
  dialogOverlayProps?: DialogOverlayProps;
}

export function DeleteUserDialog(props: DeleteUserDialogProps) {
  const { user } = useAuthenticated();

  const userToDelete = useQuery(queryFactory.user(props.userId));

  const isSelf = user?.id === props.userId;

  const { deleteUser } = useMutator();

  const targetConfirmationText = "delete";
  const [confirmationText, setConfirmationText] = useState(() => "");

  const isConfirmed = confirmationText === targetConfirmationText;

  const logout = useLogout();

  async function mutate() {
    if (isConfirmed) {
      await deleteUser({
        id: props.userId,
        deletedAt: new Date().toISOString(),
      });

      if (isSelf) await logout();
    }
  }

  return (
    <DialogOverlay isDismissable={false} {...props.dialogOverlayProps}>
      <DialogContent role="alertdialog">
        {({ close }) => (
          <>
            <DialogHeader>
              <DialogTitle>
                {isSelf ? "Delete Account" : `Delete "${userToDelete?.name}"`}?
              </DialogTitle>

              <p className="text-muted-foreground text-sm">
                Are you sure you want to continue?{" "}
                {isSelf ? "You" : `${userToDelete?.name}`} will not be able to
                access {isSelf ? "your" : "their"} account after deletion.
              </p>

              <EnforceRbac roles={["administrator"]}>
                <p className="text-muted-foreground text-sm">
                  This action can be undone by an administrator.
                </p>
              </EnforceRbac>

              <p className="text-muted-foreground text-sm">
                To confirm deletion, enter "{targetConfirmationText}" in the
                text field below.
              </p>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <AriaTextField>
                <Label>Confirm</Label>

                <Input
                  placeholder={targetConfirmationText}
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
                variant="destructive"
                onPress={() =>
                  mutate().then(() => {
                    close();
                    setConfirmationText("");
                  })
                }
                isDisabled={!isConfirmed}
              >
                Delete
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </DialogOverlay>
  );
}
