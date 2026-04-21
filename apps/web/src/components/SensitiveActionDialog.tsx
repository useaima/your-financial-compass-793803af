import { useNavigate } from "react-router-dom";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SENSITIVE_ACTIONS,
  type SensitiveActionId,
} from "@/lib/sensitiveActions";

type SensitiveActionDialogProps = {
  action: SensitiveActionId;
  checking?: boolean;
  hasVerifiedMfa?: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh?: () => Promise<unknown> | unknown;
  open: boolean;
};

export default function SensitiveActionDialog({
  action,
  checking = false,
  hasVerifiedMfa = false,
  onOpenChange,
  onRefresh,
  open,
}: SensitiveActionDialogProps) {
  const navigate = useNavigate();
  const meta = SENSITIVE_ACTIONS[action];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            {hasVerifiedMfa ? (
              <ShieldCheck className="h-5 w-5" />
            ) : (
              <AlertTriangle className="h-5 w-5" />
            )}
          </div>
          <div className="space-y-2">
            <DialogTitle>{meta.title}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
              {hasVerifiedMfa
                ? "MFA now looks enabled. Refresh your security status and try the action again."
                : meta.description}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="rounded-2xl border border-border bg-background/80 p-4 text-sm text-muted-foreground">
          MFA is only required for sensitive actions. Browsing your dashboard, insights, and history
          stays available without extra prompts.
        </div>

        <DialogFooter className="flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void onRefresh?.();
              }}
              disabled={checking}
            >
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh MFA status"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                window.open(meta.helpHref, "_blank", "noopener,noreferrer");
              }}
            >
              MFA help
            </Button>
          </div>
          <Button
            type="button"
            onClick={() => {
              onOpenChange(false);
              navigate(meta.settingsHref);
            }}
          >
            {meta.buttonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
