import { createFileRoute } from "@tanstack/react-router";

import {
  Tab,
  TabList,
  TabPanel,
  Tabs,
} from "~/app/components/ui/primitives/tabs";

export const Route = createFileRoute("/_authenticated/settings/images")({
  component: Component,
});

function Component() {
  return (
    <Tabs className="w-fit">
      <TabList>
        <Tab id="stock">Stock</Tab>

        <Tab id="custom">Custom</Tab>
      </TabList>

      <TabPanel id="stock">TODO</TabPanel>

      <TabPanel id="custom">TODO</TabPanel>
    </Tabs>
  );
}
