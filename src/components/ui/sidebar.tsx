import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "react-router-dom";

const SidebarContext = React.createContext<{
  open: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  variant: "default" | "ghost";
}>({
  open: false,
  toggleSidebar: () => {},
  closeSidebar: () => {},
  variant: "default",
});

export function useSidebar() {
  return React.useContext(SidebarContext);
}

const sidebarVariants = cva(
  "flex h-full flex-col overflow-y-auto border-r bg-sidebar-background text-sidebar-foreground",
  {
    variants: {
      variant: {
        default: "w-64",
        ghost: "w-16",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface SidebarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof sidebarVariants> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, variant, open: openProp, onOpenChange, ...props }, ref) => {
    const isMobile = useIsMobile();
    const [openState, setOpenState] = React.useState(false);
    const open = openProp !== undefined ? openProp : openState;

    const toggleSidebar = React.useCallback(() => {
      setOpenState((prev) => {
        const newState = !prev;
        onOpenChange?.(newState);
        return newState;
      });
    }, [onOpenChange]);

    const closeSidebar = React.useCallback(() => {
      setOpenState(false);
      onOpenChange?.(false);
    }, [onOpenChange]);

    // Close sidebar on route change if on mobile
    const location = useLocation();
    React.useEffect(() => {
      if (isMobile && open) {
        closeSidebar();
      }
    }, [location.pathname, isMobile, open, closeSidebar]);

    return (
      <SidebarContext.Provider
        value={{ open, toggleSidebar, closeSidebar, variant: variant || "default" }}
      >
        <aside
          ref={ref}
          className={cn(sidebarVariants({ variant }), className)}
          {...props}
        >
          {props.children}
        </aside>
      </SidebarContext.Provider>
    );
  },
);
Sidebar.displayName = "Sidebar";

const SidebarToggle = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar } = useSidebar();
  return (
    <button
      ref={ref}
      className={cn("p-2", className)}
      onClick={(e) => {
        toggleSidebar();
        onClick?.(e);
      }}
      {...props}
    />
  );
});
SidebarToggle.displayName = "SidebarToggle";

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-between p-4", className)}
    {...props}
  />
));
SidebarHeader.displayName = "SidebarHeader";

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("mt-auto p-4 border-t border-sidebar-border", className)}
    {...props}
  />
));
SidebarFooter.displayName = "SidebarFooter";

const SidebarBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex-grow p-4", className)} {...props} />
));
SidebarBody.displayName = "SidebarBody";

const SidebarItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    asChild?: boolean;
    active?: boolean;
  }
>(({ className, asChild, active, ...props }, ref) => {
  const Comp = asChild ? Slot : "div";
  const { variant } = useSidebar();
  return (
    <Comp
      ref={ref}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        variant === "default"
          ? "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          : "justify-center",
        active &&
          (variant === "default"
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "bg-sidebar-accent text-sidebar-accent-foreground"),
        className,
      )}
      {...props}
    />
  );
});
SidebarItem.displayName = "SidebarItem";

export {
  Sidebar,
  SidebarToggle,
  SidebarHeader,
  SidebarFooter,
  SidebarBody,
  SidebarItem,
};