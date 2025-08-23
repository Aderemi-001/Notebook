"use client";

import * as React from "react";
import {
  Panel as ResizablePrimitivePanel,
  PanelGroup as ResizablePrimitivePanelGroup,
  PanelResizeHandle as ResizablePrimitivePanelResizeHandle,
} from "react-resizable-panels";

import { cn } from "@/lib/utils";

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof ResizablePrimitivePanelGroup>) => (
  <ResizablePrimitivePanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className,
    )}
    {...props}
  />
);

const ResizablePanel = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof ResizablePrimitivePanel>) => (
  <ResizablePrimitivePanel className={cn(className)} {...props} />
);

// Create a type for the PanelResizeHandle that explicitly includes the ref prop
type PanelResizeHandleComponent = React.ComponentType<
  React.ComponentPropsWithoutRef<typeof ResizablePrimitivePanelResizeHandle> & {
    ref?: React.Ref<HTMLDivElement>;
  }
>;

const ResizableHandle = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof ResizablePrimitivePanelResizeHandle>
>(({ className, ...props }, ref) => {
  // Cast the component to the new type that explicitly includes the ref prop
  const TypedPanelResizeHandle = ResizablePrimitivePanelResizeHandle as PanelResizeHandleComponent;
  return (
    <TypedPanelResizeHandle
      ref={ref}
      className={cn(
        "relative flex w-px items-center justify-center bg-border after:absolute after:left-1/2 after:-translate-x-1/2 after:w-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:-translate-y-1/2 [&[data-panel-group-direction=vertical]>div]:w-full [&>div]:h-full",
        "after:bg-border after:transition-all after:duration-300 after:hover:bg-primary after:data-[panel-group-direction=vertical]:hover:bg-primary after:data-[state=active]:bg-primary after:data-[state=active]:data-[panel-group-direction=vertical]:bg-primary",
        className,
      )}
      {...props}
    />
  );
});
ResizableHandle.displayName = "ResizableHandle";

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };