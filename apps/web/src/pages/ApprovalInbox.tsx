import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ClipboardCheck, Clock3, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import SensitiveActionDialog from "@/components/SensitiveActionDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePublicUser } from "@/context/PublicUserContext";
import type { ApprovalRequest } from "@/lib/evaContracts";
import { formatCurrency } from "@/lib/finance";
import { cn } from "@/lib/utils";

const riskStyles: Record<ApprovalRequest["risk_class"], string> = {
  low: "border-primary/20 bg-primary/10 text-primary",
  medium: "border-[hsl(var(--chart-5)/0.26)] bg-[hsl(var(--chart-5)/0.08)] text-[hsl(var(--chart-5))]",
  high: "border-destructive/20 bg-destructive/10 text-destructive",
};

function formatDate(value: string | null) {
  if (!value) return "No deadline";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function getIntentProvider(request: ApprovalRequest) {
  const intent = request.execution_intent;
  if (intent && typeof intent === "object" && "provider" in intent) {
    return intent.provider === "utg" ? "UTG-backed if available" : "Manual external action";
  }

  return "Manual external action";
}

function renderPayloadSummary(request: ApprovalRequest) {
  const payload = request.request_payload ?? {};
  const merchant = typeof payload.merchant === "string" ? payload.merchant : null;
  const subscriptionName = typeof payload.subscription_name === "string" ? payload.subscription_name : null;
  const dueDate = typeof payload.due_date === "string" ? payload.due_date : null;
  const amount = typeof payload.amount === "number" ? payload.amount : typeof payload.monthly_impact === "number" ? payload.monthly_impact : null;

  return (
    <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-4">
      <div>
        <p className="font-semibold text-foreground">Target</p>
        <p>{subscriptionName ?? merchant ?? "Manual external action"}</p>
      </div>
      <div>
        <p className="font-semibold text-foreground">Amount</p>
        <p>{amount ? formatCurrency(amount) : "Flexible"}</p>
      </div>
      <div>
        <p className="font-semibold text-foreground">Due</p>
        <p>{dueDate ? formatDate(dueDate) : "No deadline"}</p>
      </div>
      <div>
        <p className="font-semibold text-foreground">Execution</p>
        <p>{getIntentProvider(request)}</p>
      </div>
    </div>
  );
}

export default function ApprovalInbox() {
  const { bootstrap, proposeBillAction, approveRequest, rejectRequest } = usePublicUser();
  const [pendingApprovalId, setPendingApprovalId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [billProposal, setBillProposal] = useState({
    merchant: "",
    amount: "",
    dueDate: "",
    note: "",
    proposalAction: "bill_reminder" as "bill_reminder" | "merchant_follow_up",
  });

  const pendingRequests = useMemo(
    () => bootstrap.approval_requests.filter((request) => request.status === "pending"),
    [bootstrap.approval_requests],
  );
  const resolvedRequests = useMemo(
    () => bootstrap.approval_requests.filter((request) => request.status !== "pending").slice(0, 6),
    [bootstrap.approval_requests],
  );

  const handleCreateProposal = async () => {
    if (!billProposal.merchant.trim()) {
      toast.error("Add a merchant or bill name first.");
      return;
    }

    setCreating(true);
    try {
      await proposeBillAction({
        merchant: billProposal.merchant.trim(),
        amount: Number(billProposal.amount || 0),
        dueDate: billProposal.dueDate || null,
        note: billProposal.note.trim() || null,
        proposalAction: billProposal.proposalAction,
      });
      toast.success("Proposal sent to your approval inbox.");
      setBillProposal({
        merchant: "",
        amount: "",
        dueDate: "",
        note: "",
        proposalAction: "bill_reminder",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not create that proposal.");
    } finally {
      setCreating(false);
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectRequest({ approvalRequestId: requestId });
      toast.success("Request rejected.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not reject that request.");
    }
  };

  return (
    <div className="mx-auto max-w-[980px] space-y-6 p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Approval inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review Phase E proposals before anything becomes part of EVA’s execution history.
        </p>
      </motion.div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Pending</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{pendingRequests.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Requests waiting for your approval.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">High risk</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {pendingRequests.filter((request) => request.risk_class === "high").length}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">These deserve the closest review.</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Resolved</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{resolvedRequests.length}</p>
          <p className="mt-1 text-sm text-muted-foreground">Recent decisions already recorded.</p>
        </div>
      </div>

      <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-[0_20px_50px_-38px_rgba(110,73,75,0.22)]">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Create a bill or merchant proposal</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use this when you want EVA to stage a manual reminder or merchant follow-up for approval first.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="proposal-merchant">Merchant or bill name</Label>
            <Input id="proposal-merchant" value={billProposal.merchant} onChange={(event) => setBillProposal((current) => ({ ...current, merchant: event.target.value }))} placeholder="Electricity bill, landlord, internet provider" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proposal-amount">Amount</Label>
            <Input id="proposal-amount" type="number" value={billProposal.amount} onChange={(event) => setBillProposal((current) => ({ ...current, amount: event.target.value }))} placeholder="120" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proposal-due-date">Due date</Label>
            <Input id="proposal-due-date" type="date" value={billProposal.dueDate} onChange={(event) => setBillProposal((current) => ({ ...current, dueDate: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="proposal-type">Proposal type</Label>
            <select id="proposal-type" value={billProposal.proposalAction} onChange={(event) => setBillProposal((current) => ({ ...current, proposalAction: event.target.value as "bill_reminder" | "merchant_follow_up" }))} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background">
              <option value="bill_reminder">Bill reminder</option>
              <option value="merchant_follow_up">Merchant follow-up</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="proposal-note">Why this matters</Label>
            <Input id="proposal-note" value={billProposal.note} onChange={(event) => setBillProposal((current) => ({ ...current, note: event.target.value }))} placeholder="Due this Friday, likely to stretch free cash if I delay" />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleCreateProposal} disabled={creating}>
            {creating ? "Creating proposal..." : "Send to approval inbox"}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Pending approvals</h2>
        </div>
        {pendingRequests.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center">
            <Mail className="mx-auto h-10 w-10 text-muted-foreground/35" />
            <p className="mt-3 text-sm font-medium text-foreground">No pending proposals</p>
            <p className="mt-1 text-sm text-muted-foreground">Create a bill plan or propose a subscription action to start Phase E execution safely.</p>
          </div>
        ) : (
          pendingRequests.map((request) => (
            <article key={request.id} className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[0_18px_44px_-34px_rgba(110,73,75,0.22)]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em]", riskStyles[request.risk_class])}>
                      {request.risk_class} risk
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <Clock3 className="h-3 w-3" />
                      Expires {formatDate(request.expires_at)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{request.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{request.description}</p>
                  </div>
                  {renderPayloadSummary(request)}
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
                  <Button onClick={() => setPendingApprovalId(request.id)}>Approve</Button>
                  <Button variant="outline" onClick={() => handleReject(request.id)}>Reject</Button>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      {resolvedRequests.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Recent decisions</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {resolvedRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-border bg-card px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{request.title}</p>
                  <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{request.status}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{request.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {pendingApprovalId && (
        <SensitiveActionDialog
          action="approve_request"
          open={Boolean(pendingApprovalId)}
          onOpenChange={(open) => {
            if (!open) setPendingApprovalId(null);
          }}
          onVerified={async (verificationId) => {
            await approveRequest({
              approvalRequestId: pendingApprovalId,
              securityVerificationId: verificationId,
            });
            toast.success("Approval recorded and moved into action history.");
            setPendingApprovalId(null);
          }}
        />
      )}
    </div>
  );
}
