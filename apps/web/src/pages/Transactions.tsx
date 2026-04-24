import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Check, Copy, FileUp, Mail, PencilLine, Search, X } from "lucide-react";
import { toast } from "sonner";
import { usePublicUser } from "@/context/PublicUserContext";
import { Button } from "@/components/ui/button";
import SensitiveActionDialog from "@/components/SensitiveActionDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMfaStatus } from "@/hooks/useMfaStatus";
import {
  SPENDING_CATEGORIES,
  SPENDING_CATEGORY_COLORS,
  SPENDING_CATEGORY_ICONS,
  type SpendingCategory,
  formatCurrencyDetailed,
} from "@/lib/finance";
import { SUPPORT_LINKS } from "@/lib/supportLinks";
import { cn } from "@/lib/utils";

type TransactionRow = {
  id: string;
  date: string;
  merchant: string;
  category: SpendingCategory;
  amount: number;
};

const categories: Array<SpendingCategory | "All"> = ["All", ...SPENDING_CATEGORIES];

const fadeUp = {
  hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: index * 0.03, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  }),
};

function getImportSourceLabel(source: "csv" | "forwarded_email" | "receipt_image") {
  if (source === "csv") return "CSV import";
  if (source === "receipt_image") return "Receipt photo";
  return "Forwarded receipt";
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("We could not read that image."));
    };
    reader.onerror = () => reject(new Error("We could not read that image."));
    reader.readAsDataURL(file);
  });
}

async function optimizeReceiptImage(file: File) {
  const dataUrl = await fileToDataUrl(file);

  if (typeof window === "undefined") {
    return dataUrl;
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new window.Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error("We could not open that receipt photo."));
    nextImage.src = dataUrl;
  });

  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return dataUrl;
  }

  // Shrink large receipt photos before sending them through the finance-core edge function.
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function Transactions() {
  const {
    bootstrap,
    analyzeReceiptImage,
    importCsvTransactions,
    reviewDraftTransaction,
    userId,
  } = usePublicUser();
  const [filter, setFilter] = useState<SpendingCategory | "All">("All");
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [receiptImporting, setReceiptImporting] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [receiptGateOpen, setReceiptGateOpen] = useState(false);
  const [reviewGateOpen, setReviewGateOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    merchant: "",
    category: "Other",
    amount: "",
    transaction_date: "",
    description: "",
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const receiptImageInputRef = useRef<HTMLInputElement | null>(null);
  const receiptCameraInputRef = useRef<HTMLInputElement | null>(null);
  const {
    hasVerifiedMfa,
    loading: mfaLoading,
    refresh: refreshMfaStatus,
  } = useMfaStatus();

  const ensureSensitiveAccess = async (
    action: "receipt_forwarding" | "review_draft_transaction",
  ) => {
    const status = hasVerifiedMfa
      ? { hasVerifiedMfa: true }
      : await refreshMfaStatus();

    if (status.hasVerifiedMfa) {
      return true;
    }

    if (action === "receipt_forwarding") {
      setReceiptGateOpen(true);
    } else {
      setReviewGateOpen(true);
    }

    return false;
  };

  const transactions = useMemo<TransactionRow[]>(
    () =>
      bootstrap.spending_logs.flatMap((log) =>
        log.items.map((item, index) => ({
          id: `${log.id}-${index}`,
          date: log.date,
          merchant: item.description,
          category: (item.category as SpendingCategory) ?? "Other",
          amount: Number(item.amount || 0),
        })),
      ),
    [bootstrap.spending_logs],
  );

  const pendingDrafts = bootstrap.draft_transactions.filter(
    (draft) => draft.status === "pending",
  );
  const receiptForwardAddress = userId
    ? `receipts+${userId}@useaima.com`
    : "receipts@useaima.com";

  const filtered = useMemo(
    () =>
      transactions.filter((transaction) => {
        if (filter !== "All" && transaction.category !== filter) return false;
        if (search && !transaction.merchant.toLowerCase().includes(search.toLowerCase())) {
          return false;
        }
        return true;
      }),
    [filter, search, transactions],
  );

  const grouped = useMemo(() => {
    const groupedMap: Record<string, TransactionRow[]> = {};
    filtered.forEach((transaction) => {
      const label = new Date(transaction.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      (groupedMap[label] ||= []).push(transaction);
    });
    return Object.entries(groupedMap);
  }, [filtered]);

  const openDraftEditor = (draftId: string) => {
    const draft = bootstrap.draft_transactions.find((item) => item.id === draftId);
    if (!draft) return;

    setEditingDraftId(draftId);
    setEditForm({
      merchant: draft.merchant,
      category: draft.category,
      amount: String(draft.amount),
      transaction_date: draft.transaction_date,
      description: draft.description,
    });
  };

  const handleCopyReceiptAddress = async () => {
    if (!(await ensureSensitiveAccess("receipt_forwarding"))) {
      return;
    }

    try {
      await navigator.clipboard.writeText(receiptForwardAddress);
      toast.success("Receipt forwarding address copied.");
    } catch {
      toast.error("Unable to copy the receipt address right now.");
    }
  };

  const handleCsvImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setImporting(true);
    try {
      const csvText = await file.text();
      await importCsvTransactions(csvText, file.name);
      toast.success("CSV imported into your review queue.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "CSV import failed.");
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  const handleReviewDecision = async (
    draftId: string,
    decision: "approve" | "reject" | "edit",
  ) => {
    if (decision !== "reject" && !(await ensureSensitiveAccess("review_draft_transaction"))) {
      return;
    }

    try {
      await reviewDraftTransaction({
        draftTransactionId: draftId,
        decision,
        updates:
          decision === "edit"
            ? {
                merchant: editForm.merchant,
                category: editForm.category,
                amount: Number(editForm.amount || 0),
                transaction_date: editForm.transaction_date,
                description: editForm.description,
              }
            : undefined,
      });
      setEditingDraftId(null);
      toast.success(
        decision === "reject"
          ? "Draft rejected."
          : decision === "edit"
            ? "Draft approved with your edits."
            : "Draft approved and added to your spending history.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "We could not review that draft.");
    }
  };

  const handleReceiptPhoto = async (file: File | null) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a receipt image.");
      return;
    }

    setReceiptImporting(true);
    try {
      const optimizedImage = await optimizeReceiptImage(file);
      await analyzeReceiptImage(optimizedImage, file.name || "receipt-photo.jpg");
      toast.success("Receipt photo analyzed and added to your review queue.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "We could not analyze that receipt photo.",
      );
    } finally {
      setReceiptImporting(false);
      if (receiptImageInputRef.current) receiptImageInputRef.current.value = "";
      if (receiptCameraInputRef.current) receiptCameraInputRef.current.value = "";
    }
  };

  return (
    <div data-testid="transactions-shell" className="mx-auto max-w-[980px] space-y-5 p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review imported drafts, forward receipts safely, and keep your canonical spending history clean.
        </p>
      </motion.div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          {
            label: "Tracked line items",
            value: transactions.length,
            detail: "Already approved into your workspace",
          },
          {
            label: "Pending review",
            value: pendingDrafts.length,
            detail: "CSV rows or receipts waiting for approval",
          },
          {
            label: "Recent import jobs",
            value: bootstrap.import_jobs.length,
            detail: "Latest import attempts across files, photos, and receipts",
          },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            custom={index}
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="rounded-2xl border border-border bg-card p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.detail}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[1.5rem] border border-border bg-card p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                CSV import
              </p>
              <h2 className="mt-2 text-lg font-semibold text-foreground">
                Bring in existing transactions without writing directly to your ledger
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Upload a CSV with date, merchant, and amount columns. EVA puts each row into a
                review queue first so you can approve, reject, or fix it before it counts.
              </p>
            </div>
            <Button
              type="button"
              data-testid="transactions-upload-csv"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="gap-2"
            >
              <FileUp className="h-4 w-4" />
              {importing ? "Importing..." : "Upload CSV"}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCsvImport}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-[1.5rem] border border-border bg-card p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Receipt photos
          </p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">
            Upload or snap a receipt and let EVA prepare the draft items
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Share a supermarket receipt, till check, or paper slip. EVA will extract the grounded amounts it can read, group them into sensible categories, and send them into your review queue.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              data-testid="transactions-upload-receipt-photo"
              onClick={() => receiptImageInputRef.current?.click()}
              disabled={receiptImporting}
              className="gap-2"
            >
              <FileUp className="h-4 w-4" />
              {receiptImporting ? "Analyzing..." : "Upload photo"}
            </Button>
            <Button
              type="button"
              data-testid="transactions-take-receipt-photo"
              onClick={() => receiptCameraInputRef.current?.click()}
              disabled={receiptImporting}
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              {receiptImporting ? "Opening camera..." : "Take photo"}
            </Button>
          </div>
          <input
            ref={receiptImageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void handleReceiptPhoto(event.target.files?.[0] ?? null)}
          />
          <input
            ref={receiptCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => void handleReceiptPhoto(event.target.files?.[0] ?? null)}
          />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="rounded-[1.5rem] border border-border bg-card p-5"
      >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Forward receipts
          </p>
          <h2 className="mt-2 text-lg font-semibold text-foreground">
            Email receipts to your EVA inbox
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Forward receipt emails here. EVA will turn them into draft transactions for review
            instead of silently logging them.
          </p>
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-border/80 bg-background/80 px-3 py-3">
            <Mail className="h-4 w-4 text-primary" />
            <span data-testid="transactions-receipt-address" className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
              {receiptForwardAddress}
            </span>
            <Button data-testid="transactions-copy-receipt-address" type="button" variant="outline" size="sm" onClick={handleCopyReceiptAddress}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Need setup help?{" "}
            <a
              href={SUPPORT_LINKS.forwardReceipts}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary hover:text-primary/85"
            >
              Read the forwarding guide
            </a>
            .
          </p>
      </motion.div>

      {bootstrap.import_jobs.length > 0 && (
        <div data-testid="transactions-import-jobs" className="space-y-3 rounded-[1.5rem] border border-border bg-card p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Recent import jobs
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Latest file and receipt processing runs
            </h2>
          </div>
          <div className="space-y-2">
            {bootstrap.import_jobs.slice(0, 5).map((job) => (
              <div key={job.id} className="rounded-2xl border border-border/80 bg-background/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {job.file_name || job.source_ref || getImportSourceLabel(job.source)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {job.imported_count} draft(s) created · {job.duplicate_count} duplicate(s) skipped
                    </p>
                  </div>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                    {job.status.replace(/_/g, " ")}
                  </span>
                </div>
                {job.error_message ? (
                  <p className="mt-2 text-xs text-muted-foreground">{job.error_message}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingDrafts.length > 0 && (
        <div data-testid="transactions-review-queue" className="space-y-3 rounded-[1.5rem] border border-border bg-card p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Review queue
              </p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">
                Approve or reject imported transactions
              </h2>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {pendingDrafts.length} pending
            </span>
          </div>

          <div className="space-y-3">
            {pendingDrafts.map((draft, index) => (
              <motion.div
                key={draft.id}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                className="rounded-2xl border border-border/80 bg-background/90 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-foreground">{draft.merchant}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(draft.transaction_date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      · {getImportSourceLabel(draft.source)}
                    </p>
                    <p className="break-words text-sm text-muted-foreground">{draft.description}</p>
                  </div>
                  <div className="sm:text-right">
                    <span
                      className="inline-flex rounded-full px-2 py-1 text-[10px] font-medium"
                      style={{
                        backgroundColor: `${SPENDING_CATEGORY_COLORS[(draft.category as SpendingCategory) ?? "Other"]}15`,
                        color:
                          SPENDING_CATEGORY_COLORS[(draft.category as SpendingCategory) ?? "Other"],
                      }}
                    >
                      {draft.category}
                    </span>
                    <p className="mt-2 text-lg font-bold text-foreground">
                      {formatCurrencyDetailed(draft.amount)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    data-testid={`draft-approve-${draft.id}`}
                    type="button"
                    size="sm"
                    className="gap-1.5 sm:w-auto"
                    onClick={() => handleReviewDecision(draft.id, "approve")}
                  >
                    <Check className="h-3.5 w-3.5" />
                    Approve
                  </Button>
                  <Button
                    data-testid={`draft-edit-${draft.id}`}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5 sm:w-auto"
                    onClick={() => openDraftEditor(draft.id)}
                  >
                    <PencilLine className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    data-testid={`draft-reject-${draft.id}`}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-destructive hover:text-destructive sm:w-auto"
                    onClick={() => handleReviewDecision(draft.id, "reject")}
                  >
                    <X className="h-3.5 w-3.5" />
                    Reject
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          data-testid="transactions-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search approved transaction descriptions..."
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex gap-1.5 overflow-x-auto pb-1"
      >
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setFilter(category)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition-colors",
              filter === category
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {category !== "All" && `${SPENDING_CATEGORY_ICONS[category]} `}
            {category}
          </button>
        ))}
      </motion.div>

      {transactions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="text-sm font-medium text-foreground">No approved transactions yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Use the AI Advisor, a CSV import, or forwarded receipts and then approve drafts here.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            If chat logs do not appear where you expect,{" "}
            <a
              href={SUPPORT_LINKS.historyMismatch}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-primary hover:text-primary/85"
            >
              open the help article
            </a>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, transactionRows], groupIndex) => (
            <div key={date}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {date}
              </p>
              <div className="space-y-1">
                {transactionRows.map((transaction, index) => (
                  <motion.div
                    key={transaction.id}
                    custom={groupIndex * 3 + index}
                    initial="hidden"
                    animate="visible"
                    variants={fadeUp}
                    className="rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/15"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-lg">{SPENDING_CATEGORY_ICONS[transaction.category]}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-medium">{transaction.merchant}</p>
                            <p className="text-[11px] text-muted-foreground">{transaction.category}</p>
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-foreground">
                            {formatCurrencyDetailed(transaction.amount)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span
                            className="rounded-full px-2 py-1 text-[10px] font-medium"
                            style={{
                              backgroundColor: `${SPENDING_CATEGORY_COLORS[transaction.category]}15`,
                              color: SPENDING_CATEGORY_COLORS[transaction.category],
                            }}
                          >
                            {transaction.category}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={Boolean(editingDraftId)} onOpenChange={(open) => !open && setEditingDraftId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit imported transaction</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="draft-merchant">Merchant</Label>
              <Input
                id="draft-merchant"
                value={editForm.merchant}
                onChange={(event) => setEditForm((current) => ({ ...current, merchant: event.target.value }))}
              />
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="draft-category">Category</Label>
                <Input
                  id="draft-category"
                  value={editForm.category}
                  onChange={(event) => setEditForm((current) => ({ ...current, category: event.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="draft-amount">Amount</Label>
                <Input
                  id="draft-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(event) => setEditForm((current) => ({ ...current, amount: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="draft-date">Transaction date</Label>
              <Input
                id="draft-date"
                type="date"
                value={editForm.transaction_date}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, transaction_date: event.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="draft-description">Description</Label>
              <Input
                id="draft-description"
                value={editForm.description}
                onChange={(event) =>
                  setEditForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingDraftId(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => editingDraftId && handleReviewDecision(editingDraftId, "edit")}
              >
                Approve with changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SensitiveActionDialog
        action="receipt_forwarding"
        checking={mfaLoading}
        hasVerifiedMfa={hasVerifiedMfa}
        open={receiptGateOpen}
        onOpenChange={setReceiptGateOpen}
        onRefresh={refreshMfaStatus}
      />

      <SensitiveActionDialog
        action="review_draft_transaction"
        checking={mfaLoading}
        hasVerifiedMfa={hasVerifiedMfa}
        open={reviewGateOpen}
        onOpenChange={setReviewGateOpen}
        onRefresh={refreshMfaStatus}
      />
    </div>
  );
}
