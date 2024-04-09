import { createFileRoute } from "@tanstack/react-router";
import { z } from "astro/zod";

import { Button } from "~/app/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/app/components/card";
import { Input } from "~/app/components/input";
import { Label } from "~/app/components/label";

export const Route = createFileRoute("/login")({
  validateSearch: (search) =>
    z.object({ org: z.string().catch("") }).parse(search),
  component: () => <Component />,
});

function Component() {
  const { org } = Route.useSearch();

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-2xl">
          <CardTitle>Login</CardTitle>

          <CardDescription>
            Enter your organization below to login to your account.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="org">Organization</Label>
            <Input id="org" />
          </div>
        </CardContent>

        <CardFooter>
          <Button className="w-full">Sign in</Button>
        </CardFooter>
      </Card>
    </div>
  );
}
