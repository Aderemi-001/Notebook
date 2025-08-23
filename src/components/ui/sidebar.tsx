import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { VariantProps, cva } from "class-variance-authority";
import { PanelLeft } from "lucide-react";

import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type SidebarContextProps = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebar: () => void;
  collapsible: "oncanvas" | "offcanvas";
};

const SidebarContext = React.createContext<SidebarContextProps | undefined>(
  undefined
);

function useSidebar() {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error("useSidebar must be used within a <Sidebar />");
  }

  return context;
}

type SidebarProps = {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  collapsible?: "oncanvas" | "offcanvas";
} & React.HTMLAttributes<HTMLDivElement>;

const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  (
    {
      defaultOpen = true,
      open: openProp,
      onOpenChange: setOpenProp,
      collapsible = "oncanvas",
      className,
      style,
      children,
      ...props
    },
    ref
  ) => {
    const isMobile = useIsMobile();
    const [open, setOpen] = React.useState(defaultOpen);
    const [openMobile, setOpenMobile] = React.useState(false);

    React.useEffect(() => {
      if (openProp !== undefined) {
        setOpen(openProp);
      }
    }, [openProp]);

    const toggleSidebar = React.useCallback(() => {
      if (setOpenProp) {
        setOpenProp(!open);
      } else {
        isMobile
          ? setOpenMobile((open: boolean) => !open)
          : setOpen((open: boolean) => !open);
      }
    }, [isMobile, open, setOpen, setOpenMobile, setOpenProp]);

    const contextValue = React.useMemo(
      () => ({
        open: isMobile ? openMobile : open,
        setOpen: isMobile ? setOpenMobile : setOpen,
        toggleSidebar,
        collapsible,
      }),
      [isMobile, open, openMobile, toggleSidebar, collapsible]
    );

    if (isMobile && collapsible === "offcanvas") {
      return (
        <SidebarContext.Provider value={contextValue}>
          <Sheet open={openMobile} onOpenChange={setOpenMobile}>
            <SheetTrigger asChild>{children}</SheetTrigger>
            <SheetContent side="left" className="flex h-full w-full flex-col">
              {children}
            </SheetContent>
          </Sheet>
        </SidebarContext.Provider>
      );
    }

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            ref={ref}
            className={cn(
              "flex",
              collapsible === "oncanvas" && "h-full",
              className
            )}
            style={
              {
                "--sidebar-width": open ? "280px" : "56px",
                ...style,
              } as React.CSSProperties
            }
            {...props}
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    );
  }
);
Sidebar.displayName = "Sidebar";

type SidebarPanelProps = {
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const SidebarPanel = React.forwardRef<HTMLDivElement, SidebarPanelProps>(
  ({ className, children, ...props }, ref) => {
    const { open, collapsible } = useSidebar();
    return (
      <div
        ref={ref}
        className={cn(
          "relative hidden h-full flex-col border-r bg-sidebar transition-all duration-300 ease-in-out lg:flex",
          collapsible === "oncanvas" && "data-[state=open]:w-[--sidebar-width]",
          collapsible === "oncanvas" &&
            open &&
            "w-[--sidebar-width] min-w-[--sidebar-width]",
          collapsible === "oncanvas" &&
            !open &&
            "w-[--sidebar-width] min-w-[--sidebar-width]",
          className
        )}
        data-state={open ? "open" : "closed"}
        {...props}
      >
        {children}
      </div>
    );
  }
);
SidebarPanel.displayName = "SidebarPanel";

type SidebarContentProps = {
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const SidebarContent = React.forwardRef<HTMLDivElement, SidebarContentProps>(
  ({ className, ...props }, ref) => {
    const { open } = useSidebar();
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-grow flex-col",
          !open && "items-center",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarContent.displayName = "SidebarContent";

type SidebarToggleProps = {
  className?: string;
} & React.ComponentProps<typeof Button>;

const SidebarToggle = React.forwardRef<HTMLButtonElement, SidebarToggleProps>(
  ({ className, onClick, ...props }, ref) => {
    const { open, toggleSidebar } = useSidebar();
    return (
      <Button
        ref={ref}
        variant="ghost"
        className={cn("h-7 w-7", className)}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          onClick?.(event);
          toggleSidebar();
        }}
        {...props}
      >
        <PanelLeft />
        <span className="sr-only">Toggle Sidebar</span>
      </Button>
    );
  }
);
SidebarToggle.displayName = "SidebarToggle";

type SidebarHeaderProps = {
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const SidebarHeader = React.forwardRef<HTMLDivElement, SidebarHeaderProps>(
  ({ className, ...props }, ref) => {
    const { open } = useSidebar();
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-2 whitespace-nowrap px-3 py-4",
          !open && "justify-center",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarHeader.displayName = "SidebarHeader";

type SidebarHeaderTitleProps = {
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const SidebarHeaderTitle = React.forwardRef<
  HTMLDivElement,
  SidebarHeaderTitleProps
>(({ className, ...props }, ref) => {
  const { open } = useSidebar();
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center gap-2 text-lg font-semibold",
        !open && "hidden",
        className
      )}
      {...props}
    />
  );
});
SidebarHeaderTitle.displayName = "SidebarHeaderTitle";

type SidebarDescriptionProps = {
  className?: string;
} & React.HTMLAttributes<HTMLParagraphElement>;

const SidebarDescription = React.forwardRef<
  HTMLParagraphElement,
  SidebarDescriptionProps
>(({ className, ...props }, ref) => {
  const { open } = useSidebar();
  return (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", !open && "hidden", className)}
      {...props}
    />
  );
});
SidebarDescription.displayName = "SidebarDescription";

type SidebarFooterProps = {
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const SidebarFooter = React.forwardRef<HTMLDivElement, SidebarFooterProps>(
  ({ className, ...props }, ref) => {
    const { open } = useSidebar();
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center border-t p-3",
          !open && "justify-center",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarFooter.displayName = "SidebarFooter";

type SidebarMainProps = {
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const SidebarMain = React.forwardRef<HTMLDivElement, SidebarMainProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-grow flex-col gap-2 overflow-auto p-3", className)}
        {...props}
      />
    );
  }
);
SidebarMain.displayName = "SidebarMain";

type SidebarNavProps = {
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const SidebarNav = React.forwardRef<HTMLDivElement, SidebarNavProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col gap-2", className)}
        {...props}
      />
    );
  }
);
SidebarNav.displayName = "SidebarNav";

type SidebarNavMainProps = {
  className?: string;
} & React.ComponentProps<"ul">;

const SidebarNavMain = React.forwardRef<HTMLUListElement, SidebarNavMainProps>(
  ({ className, ...props }, ref) => {
    return (
      <ul
        ref={ref}
        className={cn("flex flex-col gap-2", className)}
        {...props}
      />
    );
  }
);
SidebarNavMain.displayName = "SidebarNavMain";

type SidebarNavLinkProps = {
  className?: string;
  active?: boolean;
  label?: string;
  icon?: React.ReactNode;
} & React.ComponentProps<typeof Button>;

const SidebarNavLink = React.forwardRef<HTMLButtonElement, SidebarNavLinkProps>(
  ({ className, active, label, icon, ...props }, ref) => {
    const { open } = useSidebar();
    return (
      <Button
        ref={ref}
        variant="ghost"
        className={cn(
          "justify-start gap-2",
          !open && "size-9",
          active && "bg-accent",
          className
        )}
        {...props}
      >
        {icon}
        <span className={cn("text-sm", !open && "hidden")}>{label}</span>
      </Button>
    );
  }
);
SidebarNavLink.displayName = "SidebarNavLink";

type SidebarNavSubProps = {
  className?: string;
} & React.ComponentProps<"ul">;

const SidebarNavSub = React.forwardRef<HTMLUListElement, SidebarNavSubProps>(
  ({ className, ...props }, ref) => {
    const { open } = useSidebar();
    return (
      <ul
        ref={ref}
        className={cn(
          "flex flex-col gap-2",
          !open && "hidden",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarNavSub.displayName = "SidebarNavSub";

type SidebarNavSubItemProps = {
  className?: string;
  active?: boolean;
  label?: string;
  icon?: React.ReactNode;
} & React.ComponentProps<typeof Button>;

const SidebarNavSubItem = React.forwardRef<HTMLButtonElement, SidebarNavSubItemProps>(
  ({ className, active, label, icon, ...props }, ref) => {
    const { open } = useSidebar();
    return (
      <Button
        ref={ref}
        variant="ghost"
        className={cn(
          "justify-start gap-2 pl-6",
          !open && "size-9",
          active && "bg-accent",
          className
        )}
        {...props}
      >
        {icon}
        <span className={cn("text-sm", !open && "hidden")}>{label}</span>
      </Button>
    );
  }
);
SidebarNavSubItem.displayName = "SidebarNavSubItem";

type SidebarOverlayProps = {
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const SidebarOverlay = React.forwardRef<HTMLDivElement, SidebarOverlayProps>(
  ({ className, ...props }, ref) => {
    const { open } = useSidebar();
    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden",
          !open && "hidden",
          className
        )}
        data-state={open ? "open" : "closed"}
        {...props}
      />
    );
  }
);
SidebarOverlay.displayName = "SidebarOverlay";

type SidebarLinkProps = {
  className?: string;
  active?: boolean;
  tooltip?: string;
} & React.ComponentProps<typeof Button>;

const SidebarLink = React.forwardRef<HTMLButtonElement, SidebarLinkProps>(
  ({ className, tooltip, ...props }, ref) => {
    const { open } = useSidebar();
    return (
      <Button
        ref={ref}
        variant="ghost"
        className={cn(
          "justify-start gap-2",
          !open && "size-9",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarLink.displayName = "SidebarLink";

type SidebarButtonProps = {
  className?: string;
  asChild?: boolean;
  showOnHover?: boolean;
} & React.ComponentProps<typeof Button>;

const SidebarButton = React.forwardRef<HTMLButtonElement, SidebarButtonProps>(
  ({ className, asChild = false, showOnHover = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    const { open } = useSidebar();
    return (
      <Comp
        ref={ref}
        className={cn(
          "relative flex h-9 items-center justify-center whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          !open && "size-9",
          !open && showOnHover && "lg:opacity-0 lg:group-hover:opacity-100",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarButton.displayName = "SidebarButton";

type SidebarSearchProps = {
  className?: string;
} & React.ComponentProps<typeof Input>;

const SidebarSearch = React.forwardRef<HTMLInputElement, SidebarSearchProps>(
  ({ className, ...props }, ref) => {
    const { open } = useSidebar();
    return (
      <Input
        ref={ref}
        className={cn(
          "h-9",
          !open && "hidden",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarSearch.displayName = "SidebarSearch";

type SidebarCardProps = {
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const SidebarCard = React.forwardRef<HTMLDivElement, SidebarCardProps>(
  ({ className, ...props }, ref) => {
    const { open } = useSidebar();
    return (
      <div
        ref={ref}
        className={cn(
          "overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
          !open && "hidden",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarCard.displayName = "SidebarCard";

type SidebarCardHeaderProps = {
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const SidebarCardHeader = React.forwardRef<HTMLDivElement, SidebarCardHeaderProps>(
  ({ className, ...props }, ref) => {
    const { open } = useSidebar();
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col space-y-1.5 p-6",
          !open && "hidden",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarCardHeader.displayName = "SidebarCardHeader";

type SidebarCardTitleProps = {
  className?: string;
} & React.HTMLAttributes<HTMLHeadingElement>;

const SidebarCardTitle = React.forwardRef<HTMLHeadingElement, SidebarCardTitleProps>(
  ({ className, ...props }, ref) => {
    const { open } = useSidebar();
    return (
      <h3
        ref={ref}
        className={cn(
          "font-semibold leading-none tracking-tight",
          !open && "hidden",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarCardTitle.displayName = "SidebarCardTitle";

type SidebarCardDescriptionProps = {
  className?: string;
} & React.HTMLAttributes<HTMLParagraphElement>;

const SidebarCardDescription = React.forwardRef<HTMLParagraphElement, SidebarCardDescriptionProps>(
  ({ className, ...props }, ref) => {
    const { open } = useSidebar();
    return (
      <p
        ref={ref}
        className={cn(
          "text-sm text-muted-foreground",
          !open && "hidden",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarCardDescription.displayName = "SidebarCardDescription";

type SidebarCardContentProps = {
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

const SidebarCardContent = React.forwardRef<HTMLDivElement, SidebarCardContentProps>(
  ({ className, ...props }, ref) => {
    const { open } = useSidebar();
    return (
      <div
        ref={ref}
        className={cn(
          "p-6 pt-0",
          !open && "hidden",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarCardContent.displayName = "SidebarCardContent";

type SidebarSeparatorProps = {
  className?: string;
} & React.ComponentProps<typeof Separator>;

const SidebarSeparator = React.forwardRef<HTMLDivElement, SidebarSeparatorProps>(
  ({ className, ...props }, ref) => {
    const { open } = useSidebar();
    return (
      <Separator
        ref={ref}
        className={cn(
          "my-4",
          !open && "hidden",
          className
        )}
        {...props}
      />
    );
  }
);
SidebarSeparator.displayName = "SidebarSeparator";

export {
  Sidebar,
  SidebarPanel,
  SidebarContent,
  SidebarToggle,
  SidebarHeader,
  SidebarHeaderTitle,
  SidebarDescription,
  SidebarFooter,
  SidebarMain,
  SidebarNav,
  SidebarNavMain,
  SidebarNavLink,
  SidebarNavSub,
  SidebarNavSubItem,
  SidebarOverlay,
  SidebarLink,
  SidebarButton,
  SidebarSearch,
  SidebarCard,
  SidebarCardHeader,
  SidebarCardTitle,
  SidebarCardDescription,
  SidebarCardContent,
  SidebarSeparator,
};