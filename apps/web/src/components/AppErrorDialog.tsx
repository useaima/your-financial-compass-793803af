import { useEffect, useState } from "react";
import { RefreshCcw, WifiOff } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  APP_ERROR_DIALOG_EVENT,
  NETWORK_ERROR_DESCRIPTION,
  NETWORK_ERROR_TITLE,
  type AppErrorDialogDetail,
  isNetworkError,
  isOffline,
  openNetworkErrorDialog,
} from "@/lib/appErrors";
import { SUPPORT_LINKS } from "@/lib/supportLinks";

const defaultNetworkDialog: AppErrorDialogDetail = {
  kind: "network",
  title: NETWORK_ERROR_TITLE,
  description: NETWORK_ERROR_DESCRIPTION,
};

export default function AppErrorDialog() {
  const [dialog, setDialog] = useState<AppErrorDialogDetail | null>(null);
  const [online, setOnline] = useState(() => !isOffline());

  useEffect(() => {
    const handleOffline = () => {
      setOnline(false);
      setDialog(defaultNetworkDialog);
    };

    const handleOnline = () => {
      setOnline(true);
      setDialog((current) => (current?.kind === "network" ? null : current));
      toast.success("Connection restored. You can try again.");
    };

    const handleDialogEvent = (event: Event) => {
      const customEvent = event as CustomEvent<AppErrorDialogDetail>;
      setDialog(customEvent.detail);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isNetworkError(event.reason)) {
        openNetworkErrorDialog();
      }
    };

    if (isOffline()) {
      setDialog(defaultNetworkDialog);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    window.addEventListener(APP_ERROR_DIALOG_EVENT, handleDialogEvent as EventListener);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener(APP_ERROR_DIALOG_EVENT, handleDialogEvent as EventListener);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return (
    <AlertDialog open={Boolean(dialog)} onOpenChange={(open) => !open && setDialog(null)}>
      <AlertDialogContent className="max-w-md rounded-[1.6rem] border-border bg-card/95">
        <AlertDialogHeader>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
            {online ? <RefreshCcw className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          </div>
          <AlertDialogTitle>{dialog?.title ?? NETWORK_ERROR_TITLE}</AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">
            {online
              ? dialog?.description ?? "We lost the request before it reached eva. Try again now."
              : "We cannot reach eva right now. Connect your network and try again."}
            <span className="mt-3 block text-xs text-muted-foreground">
              Need more help?{" "}
              <a
                href={SUPPORT_LINKS.offline}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary hover:text-primary/85"
              >
                Open the network recovery guide
              </a>
              .
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep browsing</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();

              if (isOffline()) {
                setOnline(false);
                setDialog(defaultNetworkDialog);
                return;
              }

              setDialog(null);
              window.location.reload();
            }}
          >
            Try again
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
