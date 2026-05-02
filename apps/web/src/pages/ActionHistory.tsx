import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock3, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePublicUser } from "@/context/PublicUserContext";
import type { ExecutionReceipt } from "@/lib/evaContracts";
import { cn } from "@/lib/utils";

const statusStyles: Record<ExecutionReceipt["status"], string> = {
  approved_pending: "border-[hsl(var(--chart-5)/0.26)] bg-[hsl(var(--chart-5)/0.08)] text-[hsl(var(--chart-5))]",
  completed: "border-primary/20 bg-primary/10 text-primary",
  failed: "border-destructive/20 bg-destructive/10 text-destructive",
  cancelled: "border-border bg-secondary text-muted-foreground",
};

function formatDate(value: string | null) {
  if (!value) return "Not yet";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function ActionHistory() {
  const { bootstrap, dispatchApprovedRequest, reconcileExecutionResult } = usePublicUser();
  const history = bootstrap.action_history;

  const counts = useMemo(() => ({
    pending: history.filter((item) => item.status === "approved_pending").length,
    completed: history.filter((item) => item.status === "completed").length,
    failed: history.filter((item) => item.status === "failed").length,
  }), [history]);

  const handleDispatch = async (approvalRequestId: string | null) => {
    if (!approvalRequestId) {
      toast.error("This action is not linked to an approval request.");
      return;
    }

    try {
      await dispatchApprovedRequest(approvalRequestId);
      toast.success("Dispatch status refreshed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not dispatch that action.");
    }
  };

  const handleReconcile = async (
    executionReceiptId: string,
    outcome: "completed" | "failed" | "cancelled",
  ) => {
    try {
      await reconcileExecutionResult({ executionReceiptId, outcome });
      toast.success(`Action marked ${outcome.replace("_", " ")}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not update that action.");
    }
  };

  return (
    <div className="mx-auto max-w-[980px] space-y-6 p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Action history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every approved Phase E action lands here with a receipt first, then a reconciliation outcome after you complete it externally.
        </p>
      </motion.div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Awaiting completion</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{counts.pending}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Completed</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{counts.completed}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Failed</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{counts.failed}</p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
          <RotateCcw className="mx-auto h-10 w-10 text-muted-foreground/35" />
          <p className="mt-3 text-sm font-medium text-foreground">No action history yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Approve a proposal first, then EVA will track its execution and reconciliation here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((receipt) => (
            <article key={receipt.id} className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_18px_44px_-34px_rgba(110,73,75,0.22)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em]", statusStyles[receipt.status])}>
                      {receipt.status.replace("_", " ")}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <Clock3 className="h-3 w-3" />
                      Executed {formatDate(receipt.executed_at)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{receipt.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{receipt.description}</p>
                  </div>
                  <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                    <div>
                      <p className="font-semibold text-foreground">Provider</p>
                      <p>{receipt.provider.replaceAll("_", " ")}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Dispatch</p>
                      <p>{receipt.dispatch_status.replaceAll("_", " ")}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Action type</p>
                      <p>{receipt.action_type.replaceAll("_", " ")}</p>
                    </div>
                  </div>
                </div>
                {receipt.status === "approved_pending" && (
                  <div className="flex flex-wrap gap-2 lg:max-w-[260px] lg:justify-end">
                    {receipt.dispatch_status === "dispatch_failed" && (
                      <Button variant="outline" onClick={() => handleDispatch(receipt.approval_request_id)} className="gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Retry dispatch
                      </Button>
                    )}
                    <Button onClick={() => handleReconcile(receipt.id, "completed")} className="gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Mark completed
                    </Button>
                    <Button variant="outline" onClick={() => handleReconcile(receipt.id, "failed")} className="gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Mark failed
                    </Button>
                    <Button variant="outline" onClick={() => handleReconcile(receipt.id, "cancelled")} className="gap-2">
                      <XCircle className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
