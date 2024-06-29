import { useState } from "react";
import { TextField as AriaTextField } from "react-aria-components";

import { Button } from "~/app/components/ui/primitives/button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
} from "~/app/components/ui/primitives/dialog";
import { Label } from "~/app/components/ui/primitives/field";
import { Input } from "~/app/components/ui/primitives/input";
import { useAuthenticated, useLogout } from "~/app/lib/hooks/auth";
import { useMutation } from "~/app/lib/hooks/data";

import type { User } from "@paperwait/core/user";

export type DeleteUserDialogProps = {
  userId: User["id"];
};

export function DeleteUserDialog(props: DeleteUserDialogProps) {
  const { user } = useAuthenticated();

  const isSelf = user?.id === props.userId;

  const { deleteUser } = useMutation();

  const targetConfirmationText = "delete";
  const [confirmationText, setConfirmationText] = useState("");

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
    <DialogOverlay isDismissable={false}>
      <DialogContent role="alertdialog">
        {({ close }) => (
          <>
            <DialogHeader>
              <DialogTitle>
                {isSelf ? "Delete Account" : "Delete User"}?
              </DialogTitle>

              <p className="text-muted-foreground text-sm">
                Are you sure you want to continue? {isSelf ? "You" : "The user"}{" "}
                will not be able to access {isSelf ? "your" : "their"} account
                after deletion.
              </p>

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
                onPress={() => mutate().then(close)}
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
