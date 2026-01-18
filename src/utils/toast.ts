import { toast } from "sonner";

export const showSuccess = (message: string, toastId?: string | number) => {
  if (toastId) {
    toast.success(message, { id: toastId });
  } else {
    toast.success(message);
  }
};

export const showError = (message: string, toastId?: string | number) => {
  if (toastId) {
    toast.error(message, { id: toastId });
  } else {
    toast.error(message);
  }
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId?: string | number) => {
  toast.dismiss(toastId);
};