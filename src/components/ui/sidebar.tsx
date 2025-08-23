import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLocation } from "react-router-dom";

type SidebarContextProps = {
  open: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  variant: "default" | "compact";
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a <Sidebar>");
  }
  return context;
}

const sidebarVariants = cva(
  "flex flex-col h-full bg-sidebar-background text-sidebar-foreground border-r border-sidebar-border",
  {
    variants: {
      variant: {
        default: "w-64",
        compact: "w-20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
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
    const location = useLocation();

    const [openState, setOpenState] = React.useState(openProp !== undefined ? openProp : !isMobile);

    React.useEffect(() => {
      if (openProp !== undefined) {
        setOpenState(openProp);
      }
    }, [openProp]);

    React.useEffect(() => {
      if (isMobile) {
        setOpenState(false);
      } else {
        setOpenState(true);
      }
    }, [isMobile, location.pathname]); // Close sidebar on mobile route change

    const toggleSidebar = React.useCallback(() => {
      setOpenState((prev: boolean) => {
        const newState = !prev;
        onOpenChange?.(newState);
        return newState;
      });
    }, [onOpenChange]);

    const closeSidebar = React.useCallback(() => {
      setOpenState(false);
      onOpenChange?.(false);
    }, [onOpenChange]);

    const currentVariant = variant || "default";

    return (
      <SidebarContext.Provider
        value={{ open: openState, toggleSidebar, closeSidebar, variant: currentVariant }}
      >
        <aside
          ref={ref}
          className={cn(
            sidebarVariants({ variant: currentVariant }),
            openState ? "translate-x-0" : "-translate-x-full",
            "transition-transform duration-200 ease-in-out",
            "fixed inset-y-0 left-0 z-40 md:relative md:translate-x-0", // Ensure it's fixed on mobile, relative on desktop
            className
          )}
          {...props}
        >
          {props.children}
        </aside>
      </SidebarContext.Provider>
    );
  }
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
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
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
    className={cn("flex items-center justify-between p-4 border-t border-sidebar-border", className)}
    {...props}
  />
));
SidebarFooter.displayName = "SidebarFooter";

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex-grow p-4 overflow-y-auto scrollbar-hide", className)} {...props} />
));
SidebarContent.displayName = "SidebarContent";

interface SidebarLinkProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
  active?: boolean;
}

const SidebarLink = React.forwardRef<HTMLDivElement, SidebarLinkProps>(
  ({ className, asChild, active, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    const { variant } = useSidebar();

    return (
      <Comp
        ref={ref}
        className={cn(
          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          active && "bg-sidebar-primary text-sidebar-primary-foreground",
          variant === "compact" && "justify-center",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarLink.displayName = "SidebarLink";

export { Sidebar, SidebarToggle, SidebarHeader, SidebarFooter, SidebarContent, SidebarLink };