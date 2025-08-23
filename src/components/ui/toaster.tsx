import { useToast } from "@/hooks/use-toast";
import { Toast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast"; // Added ToastAction
import * as React from "react";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      <ToastViewport />
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action && <ToastAction {...action} />} {/* Correctly render ToastAction */}
            <ToastClose />
          </Toast>
        );
      })}
    </ToastProvider>
  );
}