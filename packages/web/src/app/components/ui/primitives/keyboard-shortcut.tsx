import type { PropsWithChildren } from "react";

export function KeyboardShortcut(props: PropsWithChildren) {
  return (
    <kbd className="bg-muted text-muted-foreground pointer-events-none hidden h-5 select-none items-center gap-1 rounded border px-1.5 font-mono text-xs font-medium opacity-100 sm:flex">
      {props.children}
    </kbd>
  );
}
