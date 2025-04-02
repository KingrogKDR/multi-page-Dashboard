import { useTheme } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";

export function Toaster(props) {
  const { theme = "system" } = useTheme();

  return (
    <SonnerToaster
      theme={theme}
      className="sonner-toast-container"
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "sonner-toast",
          title: "sonner-toast-title",
          description: "sonner-toast-description",
          success: "sonner-toast-success",
          error: "sonner-toast-error",
          info: "sonner-toast-info",
        },
      }}
      {...props}
    />
  );
}
