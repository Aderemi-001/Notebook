import { ToastProvider, ToastViewport } from "@/components/ui/toast";

type ToasterProps = React.ComponentPropsWithoutRef<typeof ToastProvider>;

function Toaster({ ...props }: ToasterProps) {
  return (
    <ToastProvider {...props}>
      <ToastViewport />
    </ToastProvider>
  );
}

export { Toaster };