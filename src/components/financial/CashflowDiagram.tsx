import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);

interface CashflowDiagramProps {
  salary: number;
  passiveIncome: number;
  totalIncome: number;
  totalExpenses: number;
  monthlyCashflow: number;
  totalAssets: number;
  totalLiabilities: number;
}

export default function CashflowDiagram({
  salary, passiveIncome, totalIncome, totalExpenses, monthlyCashflow, totalAssets, totalLiabilities,
}: CashflowDiagramProps) {
  const positive = monthlyCashflow >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Cash Flow Diagram</h2>

      <div className="relative flex flex-col items-center gap-2">
        {/* Income Row */}
        <motion.div
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 w-full max-w-md"
        >
          <div className="flex-1 rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Salary</p>
            <p className="text-sm font-bold text-primary tabular-nums">{formatCurrency(salary)}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 rounded-lg bg-primary/10 border border-primary/20 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Income</p>
            <p className="text-sm font-bold text-primary tabular-nums">{formatCurrency(totalIncome)}</p>
          </div>
        </motion.div>

        {/* Arrow down */}
        <ArrowDown className="w-5 h-5 text-primary" />

        {/* Center - Cashflow */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}
          className={cn(
            "rounded-xl border-2 p-4 text-center w-full max-w-xs",
            positive ? "border-primary bg-primary/5" : "border-destructive bg-destructive/5"
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cash Flow Loop</p>
          <p className={cn("text-2xl font-bold tabular-nums mt-1", positive ? "text-primary" : "text-destructive")}>
            {formatCurrency(monthlyCashflow)}
          </p>
        </motion.div>

        {/* Arrow down */}
        <ArrowDown className="w-5 h-5 text-destructive" />

        {/* Expenses Row */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="flex items-center gap-3 w-full max-w-md"
        >
          <div className="flex-1 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Expenses</p>
            <p className="text-sm font-bold text-destructive tabular-nums">{formatCurrency(totalExpenses)}</p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Liabilities</p>
            <p className="text-sm font-bold text-destructive tabular-nums">{formatCurrency(totalLiabilities)}</p>
          </div>
        </motion.div>

        {/* Cycle arrows: Assets → Passive Income */}
        <div className="mt-3 flex items-center gap-3 w-full max-w-md">
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="flex-1 rounded-lg bg-primary/10 border border-primary/20 p-3 text-center"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Assets</p>
            <p className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(totalAssets)}</p>
          </motion.div>
          <div className="flex flex-col items-center shrink-0">
            <ArrowUp className="w-4 h-4 text-primary" />
            <span className="text-[9px] text-muted-foreground">generates</span>
          </div>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
            className="flex-1 rounded-lg bg-primary/10 border border-primary/20 p-3 text-center"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Passive Income</p>
            <p className="text-sm font-bold text-primary tabular-nums">{formatCurrency(passiveIncome)}</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
