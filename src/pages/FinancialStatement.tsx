import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2, RefreshCw, TrendingUp, TrendingDown, Building2, CreditCard, ArrowDown, ArrowUp, Download } from "lucide-react";
import { hasSupabaseConfig, SUPABASE_SETUP_MESSAGE, supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ManualEntryForm from "@/components/financial/ManualEntryForm";
import CashflowDiagram from "@/components/financial/CashflowDiagram";
import { useFinancialEntries } from "@/hooks/useFinancialEntries";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

type IncomeItem = { name: string; amount: number; description?: string };
type ExpenseItem = { name: string; amount: number; category: string };
type AssetItem = { name: string; type: string; value: number; cashflow: number; description?: string };
type LiabilityItem = { name: string; type: string; balance: number; payment: number; description?: string };

interface FinancialStatementData {
  income: { salary: number; items: IncomeItem[] };
  expenses: ExpenseItem[];
  assets: AssetItem[];
  liabilities: LiabilityItem[];
  passive_income: number;
  total_income: number;
  total_expenses: number;
  monthly_cashflow: number;
  summary: string;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);

const assetTypeIcons: Record<string, string> = {
  stock: "📈", real_estate: "🏠", business: "🏢", savings: "🏦", bond: "📜", other: "💎",
};
const liabilityTypeIcons: Record<string, string> = {
  mortgage: "🏠", car_loan: "🚗", credit_card: "💳", student_loan: "🎓", personal_loan: "🏦", other: "📋",
};

export default function FinancialStatement() {
  const [data, setData] = useState<FinancialStatementData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const statementRef = useRef<HTMLDivElement>(null);
  const { assets: manualAssets, liabilities: manualLiabilities, addAsset, addLiability, editAsset, editLiability, deleteAsset, deleteLiability } = useFinancialEntries();

  const exportPDF = async () => {
    if (!statementRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(statementRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: document.documentElement.classList.contains("dark") ? "#0a0a0b" : "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save("eva-Financial-Statement.pdf");
      toast.success("PDF downloaded successfully!");
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
    }
  };

  const generate = async () => {
    if (!hasSupabaseConfig) {
      toast.error(SUPABASE_SETUP_MESSAGE);
      return;
    }

    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("generate-statement");
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setData(result);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate statement");
    } finally {
      setLoading(false);
    }
  };

  const allAssets = [...(data?.assets || []), ...manualAssets];
  const allLiabilities = [...(data?.liabilities || []), ...manualLiabilities];
  const totalAssetValue = allAssets.reduce((s, a) => s + a.value, 0);
  const totalLiabilityBalance = allLiabilities.reduce((s, l) => s + l.balance, 0);
  const manualPassiveIncome = manualAssets.reduce((s, a) => s + a.cashflow, 0);
  const manualPayments = manualLiabilities.reduce((s, l) => s + l.payment, 0);
  const totalPassiveIncome = (data?.passive_income || 0) + manualPassiveIncome;
  const adjustedCashflow = (data?.monthly_cashflow || 0) + manualPassiveIncome - manualPayments;
  const netWorth = totalAssetValue - totalLiabilityBalance;

  if (!data && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center gap-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="w-16 h-16 rounded-2xl bg-primary/12 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">CASHFLOW Financial Statement</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Generate your personal financial statement in the style of Rich Dad's CASHFLOW game.
          </p>
          <button onClick={generate}
            className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors active:scale-[0.97]"
          >
            <Sparkles className="w-4 h-4" /> Generate My Statement
          </button>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">AI is analyzing your finances...</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div ref={statementRef} className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 pb-24 md:pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            Financial Statement
            <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/12 text-primary">CASHFLOW</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Rich Dad style · AI-generated analysis</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportPDF} disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {exporting ? "Exporting..." : "Export PDF"}
          </button>
          <button onClick={generate} disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Regenerate
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className={cn("rounded-xl p-5 border", adjustedCashflow >= 0 ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20")}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monthly Cash Flow</p>
            <p className={cn("text-3xl font-bold tabular-nums mt-1", adjustedCashflow >= 0 ? "text-primary" : "text-destructive")}>
              {formatCurrency(adjustedCashflow)}
            </p>
          </div>
          <div className="flex gap-6 text-sm">
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Total Income</p>
              <p className="font-semibold text-primary tabular-nums">{formatCurrency(data.total_income + manualPassiveIncome)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Total Expenses</p>
              <p className="font-semibold text-destructive tabular-nums">{formatCurrency(data.total_expenses + manualPayments)}</p>
            </div>
            <div className="text-center">
              <p className="text-muted-foreground text-xs">Net Worth</p>
              <p className={cn("font-semibold tabular-nums", netWorth >= 0 ? "text-primary" : "text-destructive")}>
                {formatCurrency(netWorth)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.07 }}>
        <CashflowDiagram
          salary={data.income.salary}
          passiveIncome={totalPassiveIncome}
          totalIncome={data.total_income + manualPassiveIncome}
          totalExpenses={data.total_expenses + manualPayments}
          monthlyCashflow={adjustedCashflow}
          totalAssets={totalAssetValue}
          totalLiabilities={totalLiabilityBalance}
        />
      </motion.div>

      <ManualEntryForm
        onAddAsset={addAsset}
        onAddLiability={addLiability}
        onEditAsset={editAsset}
        onEditLiability={editLiability}
        onDeleteAsset={deleteAsset}
        onDeleteLiability={deleteLiability}
        manualAssets={manualAssets}
        manualLiabilities={manualLiabilities}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center gap-2 bg-primary/5">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Income</h2>
            </div>
            <div className="divide-y divide-border">
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-sm font-medium text-foreground">Salary</span>
                <span className="text-sm font-semibold text-primary tabular-nums">{formatCurrency(data.income.salary)}</span>
              </div>
              {data.income.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <span className="text-sm text-foreground">{item.name}</span>
                    {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
                  </div>
                  <span className="text-sm font-semibold text-primary tabular-nums">{formatCurrency(item.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-3 bg-primary/5">
                <span className="text-sm font-bold text-foreground">Passive Income</span>
                <span className="text-sm font-bold text-primary tabular-nums">{formatCurrency(totalPassiveIncome)}</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center gap-2 bg-destructive/5">
              <TrendingDown className="w-4 h-4 text-destructive" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-destructive">Expenses</h2>
            </div>
            <div className="divide-y divide-border">
              {data.expenses.map((exp, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-foreground">{exp.name}</span>
                  <span className="text-sm font-semibold text-destructive tabular-nums">{formatCurrency(exp.amount)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between px-5 py-3 bg-destructive/5">
                <span className="text-sm font-bold text-foreground">Total Expenses</span>
                <span className="text-sm font-bold text-destructive tabular-nums">{formatCurrency(data.total_expenses + manualPayments)}</span>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center gap-2 bg-primary/5">
              <Building2 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Assets</h2>
            </div>
            <div className="divide-y divide-border">
              <div className="grid grid-cols-3 px-5 py-2 text-xs font-medium text-muted-foreground">
                <span>Asset</span><span className="text-right">Value</span><span className="text-right">Cash Flow</span>
              </div>
              {allAssets.map((asset, i) => (
                <div key={i} className="grid grid-cols-3 items-center px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{assetTypeIcons[asset.type] || "💎"}</span>
                    <div>
                      <span className="text-sm text-foreground">{asset.name}</span>
                      {asset.description && <p className="text-xs text-muted-foreground">{asset.description}</p>}
                      {i >= (data.assets?.length || 0) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/12 text-primary font-medium">Manual</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums text-right">{formatCurrency(asset.value)}</span>
                  <span className="text-sm font-semibold text-primary tabular-nums text-right">
                    <ArrowUp className="w-3 h-3 inline mr-0.5" />{formatCurrency(asset.cashflow)}
                  </span>
                </div>
              ))}
              <div className="grid grid-cols-3 items-center px-5 py-3 bg-primary/5">
                <span className="text-sm font-bold">Total Assets</span>
                <span className="text-sm font-bold text-foreground tabular-nums text-right">{formatCurrency(totalAssetValue)}</span>
                <span className="text-sm font-bold text-primary tabular-nums text-right">{formatCurrency(totalPassiveIncome)}</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-center gap-2 bg-destructive/5">
              <CreditCard className="w-4 h-4 text-destructive" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-destructive">Liabilities</h2>
            </div>
            <div className="divide-y divide-border">
              <div className="grid grid-cols-3 px-5 py-2 text-xs font-medium text-muted-foreground">
                <span>Liability</span><span className="text-right">Balance</span><span className="text-right">Payment</span>
              </div>
              {allLiabilities.map((lib, i) => (
                <div key={i} className="grid grid-cols-3 items-center px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{liabilityTypeIcons[lib.type] || "📋"}</span>
                    <div>
                      <span className="text-sm text-foreground">{lib.name}</span>
                      {lib.description && <p className="text-xs text-muted-foreground">{lib.description}</p>}
                      {i >= (data.liabilities?.length || 0) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/12 text-destructive font-medium">Manual</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums text-right">{formatCurrency(lib.balance)}</span>
                  <span className="text-sm font-semibold text-destructive tabular-nums text-right">
                    <ArrowDown className="w-3 h-3 inline mr-0.5" />{formatCurrency(lib.payment)}
                  </span>
                </div>
              ))}
              <div className="grid grid-cols-3 items-center px-5 py-3 bg-destructive/5">
                <span className="text-sm font-bold">Total Liabilities</span>
                <span className="text-sm font-bold text-foreground tabular-nums text-right">{formatCurrency(totalLiabilityBalance)}</span>
                <span className="text-sm font-bold text-destructive tabular-nums text-right">
                  {formatCurrency(allLiabilities.reduce((s, l) => s + l.payment, 0))}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {data.summary && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">AI Analysis</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{data.summary}</p>
        </motion.div>
      )}
    </div>
  );
}
