import { TextField as AriaTextField } from "react-aria-components";
import { createFileRoute } from "@tanstack/react-router";

import { Button } from "~/app/components/ui/primitives/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/app/components/ui/primitives/card";
import { Label } from "~/app/components/ui/primitives/field";
import { Input } from "~/app/components/ui/primitives/input";
import { useApi } from "~/app/lib/hooks/api";

export const Route = createFileRoute("/_authed/settings/papercut")({
  component: Component,
});

function Component() {
  return (
    <div className="grid gap-6">
      <ServerCredentialsCard />
    </div>
  );
}

// TODO: Finish implementing this component
function ServerCredentialsCard() {
  const { client } = useApi();

  async function handleSubmit() {
    await client.api.papercut.credentials.$put({
      json: {
        serverUrl:
          "https://paperwait-declan-mockpapercutapiscript.dscott1008.workers.dev",
        authToken: "auth-token",
      },
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Server Credentials</CardTitle>

        <CardDescription>
          Configure your PaperCut server credentials settings here.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <AriaTextField>
          <Label>PaperCut XML Web Services API URL</Label>

          <Input />
        </AriaTextField>

        <AriaTextField>
          <Label>Auth Token</Label>

          <Input />
        </AriaTextField>
      </CardContent>

      <CardFooter className="flex-row-reverse">
        <Button onPress={() => handleSubmit()}>Save</Button>
      </CardFooter>
    </Card>
  );
}
