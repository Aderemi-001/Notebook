"use client"

import * as React from "react"
import {
  Panel as ResizablePrimitivePanel,
  PanelGroup as ResizablePrimitivePanelGroup,
  PanelResizeHandle as ResizablePrimitivePanelResizeHandle,
} from "react-resizable-panels"

import { cn } from "@/lib/utils"

const ResizablePanelGroup = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof ResizablePrimitivePanelGroup>) => (
  <ResizablePrimitivePanelGroup
    className={cn(
      "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
      className
    )}
    {...props}
  />
)

const ResizablePanel = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof ResizablePrimitivePanel>) => (
  <ResizablePrimitivePanel className={cn(className)} {...props} />
)

const ResizableHandle = React.forwardRef<
  React.ElementRef<typeof ResizablePrimitivePanelResizeHandle>,
  React.ComponentPropsWithoutRef<typeof ResizablePrimitivePanelResizeHandle>
>(({ className, ...props }, ref) => {
  // Cast the component itself to any to bypass the type checking for ref
  const PanelResizeHandleAny = ResizablePrimitivePanelResizeHandle as any;
  return (
    <PanelResizeHandleAny
      ref={ref}
      className={cn(
        "flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
        className
      )}
      {...props}
    />
  );
});
ResizableHandle.displayName = "ResizableHandle"

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }