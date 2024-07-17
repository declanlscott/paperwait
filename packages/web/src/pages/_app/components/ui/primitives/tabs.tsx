import {
  Tab as AriaTab,
  TabList as AriaTabList,
  TabPanel as AriaTabPanel,
  Tabs as AriaTabs,
  composeRenderProps,
} from "react-aria-components";

import {
  tabListStyles,
  tabPanelStyles,
  tabsStyles,
  tabStyles,
} from "~/shared/styles/components/primitives/tabs";

import type {
  TabListProps as AriaTabListProps,
  TabPanelProps as AriaTabPanelProps,
  TabProps as AriaTabProps,
  TabsProps as AriaTabsProps,
} from "react-aria-components";

export function Tabs({ className, ...props }: AriaTabsProps) {
  return (
    <AriaTabs
      className={composeRenderProps(className, (className, renderProps) =>
        tabsStyles({ className, ...renderProps }),
      )}
      {...props}
    />
  );
}

export const TabList = <T extends object>({
  className,
  ...props
}: AriaTabListProps<T>) => (
  <AriaTabList
    className={composeRenderProps(className, (className, renderProps) =>
      tabListStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);

export const Tab = ({ className, ...props }: AriaTabProps) => (
  <AriaTab
    className={composeRenderProps(className, (className, renderProps) =>
      tabStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);

export const TabPanel = ({ className, ...props }: AriaTabPanelProps) => (
  <AriaTabPanel
    className={composeRenderProps(className, (className, renderProps) =>
      tabPanelStyles({ className, ...renderProps }),
    )}
    {...props}
  />
);
